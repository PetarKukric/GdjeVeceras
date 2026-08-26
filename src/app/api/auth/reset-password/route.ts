import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, hashToken } from '@/lib/password';

/**
 * Postavljanje nove lozinke preko tokena iz email-a.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Nedostaju podaci.' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Lozinka mora imati najmanje 8 znakova.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: hashToken(token) },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Neispravan ili već iskorišten link.' },
        { status: 400 }
      );
    }

    if (user.tokenExpires && new Date(user.tokenExpires) < new Date()) {
      return NextResponse.json(
        { error: 'Link je istekao. Zatraži novi.' },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashed,
        verificationToken: null,
        tokenExpires: null,
        failedLoginAttempts: 0,
        loginLockoutUntil: null,
      },
    });

    return NextResponse.json({ message: 'Lozinka uspješno promijenjena.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Greška na serveru' }, { status: 500 });
  }
}
