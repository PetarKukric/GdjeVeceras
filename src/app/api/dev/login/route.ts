import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { login } from '@/lib/auth';

/**
 * SAMO ZA RAZVOJ (npm run dev): automatska prijava bez lozinke.
 * Middleware u dev modu šalje neprijavljene posjetioce ovdje umjesto na /login.
 * Prijavljuje DEV_LOGIN_EMAIL (ako je postavljen) ili lokalni "Dev Admin" nalog (pravi se po potrebi).
 * U produkciji ruta uvijek vraća 404.
 */
const DEV_EMAIL = 'dev@gdjeveceras.local';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const email = (process.env.DEV_LOGIN_EMAIL || DEV_EMAIL).trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Dev Admin',
        role: 'ADMIN',
        emailVerified: new Date(),
        passwordHash: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10),
      },
    });
  }

  await login({ id: user.id, email: user.email, role: user.role, name: user.name || '' });

  const next = request.nextUrl.searchParams.get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
