import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, logout } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { deleteUserCompletely } from '@/lib/user-deletion';

/**
 * Brisanje sopstvenog naloga (GDPR).
 * Vlasnici lokala ne mogu obrisati nalog dok su vlasnici — prvo prenos vlasništva.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`account-delete:${userId}`, 3, 10 * 60_000).ok) {
      return NextResponse.json({ error: 'Previše pokušaja. Sačekaj par minuta.' }, { status: 429 });
    }

    // Blokiraj brisanje ako korisnik posjeduje lokale
    const ownedVenues = await prisma.venue.count({ where: { ownerId: userId } });
    if (ownedVenues > 0) {
      return NextResponse.json(
        { error: 'Posjedujete lokal(e). Prenesite vlasništvo ili nas kontaktirajte prije brisanja naloga.' },
        { status: 400 }
      );
    }

    await deleteUserCompletely(userId);

    // Odjava (čisti cookie)
    await logout();

    return NextResponse.json({ message: 'Nalog je uspješno obrisan.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Greška pri brisanju naloga.' }, { status: 500 });
  }
}
