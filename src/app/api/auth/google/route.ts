import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { OAUTH_COOKIE, googleAuthUrl, googleConfigured, safeNextPath } from '@/lib/google-oauth';

/** Početak Google prijave: /api/auth/google?next=/checkin */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_unavailable', origin));
  }
  if (!rateLimit(`google:${getClientIp(request)}`, 20, 10 * 60_000).ok) {
    return NextResponse.redirect(new URL('/login?error=rate_limit', origin));
  }

  const state = crypto.randomBytes(24).toString('base64url');
  const next = safeNextPath(request.nextUrl.searchParams.get('next')) || '';
  const response = NextResponse.redirect(googleAuthUrl(origin, state));
  // Lax (ne Strict): kolačić mora stići nazad kad Google preusmjeri na callback
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 600,
  });
  return response;
}
