import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import {} from '@/lib/auth';
import {} from 'next/headers';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { hasValidMxRecord } from '@/lib/server-validation';
import { sendVerificationEmail } from '@/lib/email';
import { hashToken } from '@/lib/password';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Zaštita od masovnih registracija (spam botovi)
    const rl = rateLimit(`signup:${getClientIp(request)}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: `Previše registracija sa ove adrese. Pokušajte za ${Math.ceil(rl.retryAfter / 60)} minuta.` }, { status: 429 });
    }

    const { email, password, name, company } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Sva polja su obavezna' }, { status: 400 });
    }

    // Honeypot protiv botova: skriveno polje koje ljudi nikad ne popune.
    // Botu se vraća ista "uspješna" poruka da ne zna da je odbijen.
    if (typeof company === 'string' && company.trim() !== '') {
      return NextResponse.json({
        message: 'Poslali smo verifikacioni email na tvoju adresu.',
        requiresVerification: true
      }, { status: 201 });
    }

    // Validacija unosa (dužine/type)
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: 'Ime mora imati 2–80 znakova.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Lozinka mora imati najmanje 8 znakova.' }, { status: 400 });
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
        name: name.trim(),
        role: 'USER',
        verificationToken: hashToken(verificationToken),
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
