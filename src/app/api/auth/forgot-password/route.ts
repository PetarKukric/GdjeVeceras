import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { generateRandomPassword, generateResetToken, hashPassword } from '@/lib/password';
import { sendAdminPasswordEmail, sendPasswordResetEmail } from '@/lib/email';

const RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_TOKEN_TTL_MINUTES = 30;
const ADMIN_PASSWORD_TTL_MINUTES = 15;

/**
 * "Zaboravljena lozinka":
 * - ADMIN → generiše novu nasumičnu jednokratnu lozinku i šalje je na email
 * - Ostali korisnici → šalje link za postavljanje nove lozinke
 * Poruka je uvijek generična (bez otkrivanja da li email postoji).
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !isValidEmail(normalizeEmail(email))) {
      return NextResponse.json(
        { message: 'Ako nalog sa tom adresom postoji, uputstvo je poslano na email.' },
        { status: 200 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json(
        { message: 'Ako nalog sa tom adresom postoji, uputstvo je poslano na email.' },
        { status: 200 }
      );
    }

    // Rate limit — max 1 email u minuti po nalogu
    const lastResent = user.lastResentAt ? new Date(user.lastResentAt).getTime() : 0;
    if (Date.now() - lastResent < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { message: 'Ako nalog sa tom adresom postoji, uputstvo je poslano na email.' },
        { status: 200 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastResentAt: new Date() },
    });

    if (user.role === 'ADMIN') {
      // Admin: nova nasumična jednokratna lozinka na email
      const newPassword = generateRandomPassword(12);
      const hashed = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashed,
          adminPasswordExpiresAt: new Date(Date.now() + ADMIN_PASSWORD_TTL_MINUTES * 60 * 1000),
          adminLoginResentAt: new Date(),
          failedLoginAttempts: 0,
          loginLockoutUntil: null,
        },
      });
      await sendAdminPasswordEmail(user.email, newPassword);
    } else {
      // Obični korisnik: token + link za reset
      const token = generateResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: token,
          tokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(user.email, token);
    }

    return NextResponse.json(
      { message: 'Ako nalog sa tom adresom postoji, uputstvo je poslano na email.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Greška na serveru' }, { status: 500 });
  }
}
