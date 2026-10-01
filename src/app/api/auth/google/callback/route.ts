import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { login } from '@/lib/auth';
import { OAUTH_COOKIE, exchangeCode, googleConfigured, safeNextPath } from '@/lib/google-oauth';

function fail(origin: string, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
  response.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth/google', maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!googleConfigured()) return fail(origin, 'google_unavailable');

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return fail(origin, 'google_cancelled');

  let saved: { state?: string; next?: string } = {};
  try { saved = JSON.parse(request.cookies.get(OAUTH_COOKIE)?.value || '{}'); } catch {}
  const state = params.get('state') || '';
  const code = params.get('code') || '';
  const stateOk = saved.state && state.length === saved.state.length
    && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(saved.state));
  if (!code || !stateOk) return fail(origin, 'google_failed');

  try {
    const google = await exchangeCode(origin, code);
    if (!google.emailVerified) return fail(origin, 'google_unverified');

    let user = await prisma.user.findUnique({ where: { googleId: google.sub } });
    let isNew = false;

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email: google.email } });
      if (existing) {
        // Postojeći nalog sa istim (Google-verifikovanim) emailom → poveži ga
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: google.sub,
            emailVerified: existing.emailVerified ?? new Date(),
            avatarUrl: existing.avatarUrl ?? google.picture,
          },
        });
      } else {
        // Novi nalog: lozinka je nasumična (neupotrebljiva) — može je postaviti preko "Zaboravljena lozinka"
        user = await prisma.user.create({
          data: {
            email: google.email,
            name: google.name || google.email.split('@')[0],
            passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
            googleId: google.sub,
            emailVerified: new Date(),
            avatarUrl: google.picture,
          },
        });
        isNew = true;
      }
    }

    if (user.restricted) return fail(origin, 'restricted');
    // Admin nalog ostaje isključivo na email-OTP prijavi
    if (user.role === 'ADMIN') return fail(origin, 'google_admin');

    await login({ id: user.id, email: user.email, role: user.role, name: user.name || '' });

    const staff = user.role === 'OWNER';
    const target = safeNextPath(saved.next) || (isNew ? '/profile' : staff ? '/admin/events' : '/');
    const response = NextResponse.redirect(new URL(target, origin));
    response.cookies.set(OAUTH_COOKIE, '', { path: '/api/auth/google', maxAge: 0 });
    return response;
  } catch (error) {
    console.error('Google login error:', error);
    return fail(origin, 'google_failed');
  }
}
