import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {} from '@/lib/auth';
import {} from 'next/headers';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { hasValidMxRecord } from '@/lib/server-validation';
import { sendVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Sva polja su obavezna' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Unesite ispravnu email adresu.' }, { status: 400 });
    }

    // Domain/MX check
    const isValidDomain = await hasValidMxRecord(normalizedEmail);
    if (!isValidDomain) {
      return NextResponse.json({ error: 'Email adresa nije validna ili domena ne prima email.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email je već registrovan.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name,
        role: 'USER',
        verificationToken,
        tokenExpires,
      },
    });

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationToken);

    return NextResponse.json({ 
      message: 'Poslali smo verifikacioni email na tvoju adresu.',
      requiresVerification: true
    }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Greška pri registraciji' }, { status: 500 });
  }
}
