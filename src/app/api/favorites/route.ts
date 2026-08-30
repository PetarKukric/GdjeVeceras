import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Favoriti — SIGURNOSNA POPRAVKA:
 * userId se sada uzima iz SESIJE (potpisan kolačić), a ne iz tijela zahtjeva.
 * Ranije je svako mogao slati tuđi userId i mijenjati tuđe sačuvane stavke.
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Morate biti prijavljeni.' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await _request.json().catch(() => ({}));
    const { eventId, venueId } = body;

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return NextResponse.json({ error: 'Događaj nije pronađen.' }, { status: 404 });
      }

      const existingFavorite = await prisma.eventFavorite.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });

      if (existingFavorite) {
        await prisma.eventFavorite.delete({ where: { id: existingFavorite.id } });
        return NextResponse.json({ favorited: false, type: 'EVENT' });
      } else {
        await prisma.eventFavorite.create({ data: { userId, eventId } });
        return NextResponse.json({ favorited: true, type: 'EVENT' });
      }
    } else if (venueId) {
      const venue = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue) {
        return NextResponse.json({ error: 'Lokal nije pronađen.' }, { status: 404 });
      }

      const existingFavorite = await prisma.venueFavorite.findUnique({
        where: { userId_venueId: { userId, venueId } },
      });

      if (existingFavorite) {
        await prisma.venueFavorite.delete({ where: { id: existingFavorite.id } });
        return NextResponse.json({ favorited: false, type: 'VENUE' });
      } else {
        await prisma.venueFavorite.create({ data: { userId, venueId } });
        return NextResponse.json({ favorited: true, type: 'VENUE' });
      }
    }

    return NextResponse.json({ error: 'Nedostaje ID događaja ili lokala.' }, { status: 400 });
  } catch (error) {
    console.error("Favorite API Error:", error);
    return NextResponse.json({ error: 'Došlo je do greške na serveru.' }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Uvijek vraćamo favorite ULOGOVANOG korisnika (ignorišemo userId param)
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ events: [], venues: [], eventIds: [], venueIds: [] });
    }
    const userId = session.user.id;

    const [eventFavorites, venueFavorites] = await Promise.all([
      prisma.eventFavorite.findMany({
        where: { userId },
        include: { event: { include: { venue: true } } }
      }),
      prisma.venueFavorite.findMany({
        where: { userId },
        include: { venue: { include: { _count: { select: { events: true } } } } }
      })
    ]);

    return NextResponse.json({
      events: eventFavorites.map(f => f.event),
      venues: venueFavorites.map(f => f.venue),
      eventIds: eventFavorites.map(f => f.eventId),
      venueIds: venueFavorites.map(f => f.venueId),
    });
  } catch (_unused) {
    console.error("Favorite GET API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
