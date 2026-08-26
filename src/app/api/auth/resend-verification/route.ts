import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';
import { normalizeEmail } from '@/lib/validation';
import { hashToken } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email je obavezan.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // For security, don't reveal if user exists, but here the user just tried to log in
      // so it's probably okay to be slightly more specific or just return success.
      // But the instructions say "Pošalji verifikacioni email ponovo" button on login.
      return NextResponse.json({ message: 'Ako nalog postoji, poslali smo novi email.' });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email je već potvrđen.' }, { status: 400 });
    }

    // Rate limiting: 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (user.lastResentAt && user.lastResentAt > twoMinutesAgo) {
      return NextResponse.json({ error: 'Molimo sačekajte par minuta prije ponovnog slanja.' }, { status: 429 });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: hashToken(verificationToken),
        tokenExpires,
        lastResentAt: new Date(),
      },
    });

    await sendVerificationEmail(normalizedEmail, verificationToken);

    return NextResponse.json({ message: 'Novi verifikacioni email je poslat.' });
  } catch (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: 'Greška pri slanju emaila.' }, { status: 500 });
  }
}
