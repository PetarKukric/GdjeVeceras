import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/password';

/**
 * Promjena lozinke prijavljenog korisnika.
 * Traži trenutnu lozinku (sprječava mijenjanje sa ukradenom sesijom).
 * ADMIN nalozi koriste jednokratnu lozinku preko email-a — za njih je onemogućeno.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Niste prijavljeni.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
      return NextResponse.json({ error: 'Unesite trenutnu lozinku.' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'Nova lozinka mora imati najmanje 8 znakova.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'Korisnik ne postoji.' }, { status: 404 });
    }

    // Admin koristi jednokratnu email lozinku — nema trajne lozinke za promjenu
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin nalog koristi jednokratnu lozinku koja stiže na email.' },
        { status: 400 }
      );
    }

    // Provjeri trenutnu lozinku
    const ok = user.passwordHash && (await verifyPassword(currentPassword, user.passwordHash));
    if (!ok) {
      return NextResponse.json({ error: 'Trenutna lozinka nije ispravna.' }, { status: 401 });
    }

    // Spasi novu (bcrypt) i resetuj brojač neuspješnih prijava
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        failedLoginAttempts: 0,
        loginLockoutUntil: null,
      },
    });

    return NextResponse.json({ message: 'Lozinka je uspješno promijenjena.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Greška na serveru.' }, { status: 500 });
  }
}
