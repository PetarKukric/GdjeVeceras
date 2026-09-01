import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { verifyPassword } from '@/lib/password';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function createSession(user: { id: string; email: string; role: string; name: string | null }) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({
    user: { id: user.id, email: user.email, role: user.role, name: user.name || '' },
    expires,
  });
  const cookieStore = await cookies();
  cookieStore.set('bl_session', session, {
    expires,
    httpOnly: true,
    secure: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
    path: '/',
  });
  return { id: user.id, email: user.email, role: user.role, name: user.name || '' };
}

export async function POST(request: NextRequest) {
  try {
    // Zaštita od brute-force po IP adresi (uz postojeće zaključavanje računa)
    const rl = rateLimit(`login:${getClientIp(request)}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json({ error: `Previše pokušaja prijave. Sačekajte ${rl.retryAfter} sekundi.` }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email i lozinka su obavezni' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Unesite ispravnu email adresu.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Restrikcija (admin ban) - prijava onemogućena
    if (user?.restricted) {
      return NextResponse.json({ error: 'Vaš račun je ograničen. Pišite nam preko kontakt forme.' }, { status: 403 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Pogrešan email ili lozinka.' }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({
        error: 'Prvo potvrdi svoj email.',
        requiresVerification: true,
        email: user.email
      }, { status: 403 });
    }

    // Rate limit: zaključan nalog?
    if (user.loginLockoutUntil && new Date(user.loginLockoutUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.loginLockoutUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Previše neuspješnih pokušaja. Pokušaj ponovo za ${minutesLeft} min.` },
        { status: 429 }
      );
    }

    // ===== ADMIN: email-OTP prijava =====
    // OTP se izdaje isključivo kroz "Zaboravljena lozinka". Pogrešan login
    // ne smije generisati novu lozinku jer bi napadač mogao spamovati admina
    // i stalno poništavati prethodno izdani OTP.
    if (user.role === 'ADMIN') {
      const passwordOk =
        user.passwordHash &&
        (await verifyPassword(password, user.passwordHash)) &&
        (!user.adminPasswordExpiresAt || new Date(user.adminPasswordExpiresAt) > new Date());

      if (passwordOk) {
        // Uspješna prijava → poništi lozinku (jednokratna upotreba)
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: '',
            adminPasswordExpiresAt: null,
            failedLoginAttempts: 0,
            loginLockoutUntil: null,
          },
        });
        const sessionUser = await createSession(user);
        return NextResponse.json({ message: 'Uspešna prijava', user: sessionUser });
      }

      const failedAttempts = user.failedLoginAttempts + 1;
      const lockoutUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockoutUntil ? 0 : failedAttempts,
          loginLockoutUntil: lockoutUntil,
        },
      });
      return NextResponse.json({
        error: 'Pogrešna ili istekla jednokratna lozinka. Zatražite novu preko opcije „Zaboravljena lozinka“.',
      }, { status: 401 });
    }

    // ===== OBIČNI KORISNICI =====
    const passwordMatch = await verifyPassword(password, user.passwordHash);

    if (!passwordMatch) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const data: any = { failedLoginAttempts: failedAttempts };
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        data.loginLockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        data.failedLoginAttempts = 0;
      }
      await prisma.user.update({ where: { id: user.id }, data });
      return NextResponse.json({ error: 'Pogrešan email ili lozinka.' }, { status: 401 });
    }

    // Uspješna prijava → resetuj brojač
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, loginLockoutUntil: null },
    });
    const sessionUser = await createSession(user);
    return NextResponse.json({ message: 'Uspešna prijava', user: sessionUser });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Greška na serveru' }, { status: 500 });
  }
}
