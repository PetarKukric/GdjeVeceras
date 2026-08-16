import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isValidBosnianPhone } from '@/lib/validation';

/**
 * Automatsko čišćenje: rezervacije za događaje koji su prošli se brišu,
 * a njihovi stolovi se vraćaju u slobodno stanje.
 */
async function cleanupPastReservations() {
  const now = new Date();
  // Oslobodi stolove vezane za rezervacije prošlih događaja
  await prisma.eventFloorItem.updateMany({
    where: {
      reservation: {
        event: { endDateTime: { lt: now } },
      },
    },
    data: { status: 'AVAILABLE', reservationId: null },
  });
  await prisma.eventTableGroup.updateMany({
    where: {
      reservation: {
        event: { endDateTime: { lt: now } },
      },
    },
    data: { reservationId: null },
  });
  // Obriši same rezervacije
  const deleted = await prisma.reservation.deleteMany({
    where: {
      event: { endDateTime: { lt: now } },
    },
  });
  if (deleted.count > 0) {
    console.log(`🧹 Automatski obrisano ${deleted.count} rezervacija za prošle događaje.`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const venueId = searchParams.get('venueId');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Automatsko čišćenje rezervacija za prošle događaje
    await cleanupPastReservations();

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (venueId) where.venueId = venueId;

    // Owners can only see reservations for their venues
    if (session.user.role === 'OWNER') {
        const ownedVenues = await prisma.venue.findMany({
            where: { ownerId: session.user.id },
            select: { id: true }
        });
        const ownedVenueIds = ownedVenues.map(v => v.id);
        where.venueId = { in: ownedVenueIds };
    }

    // Obični korisnici vide samo svoje rezervacije
    if (session.user.role === 'USER') {
        where.userId = session.user.id;
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        event: { select: { title: true, slug: true, startDateTime: true, endDateTime: true } },
        venue: { select: { name: true, slug: true } },
        assignedItems: true,
        assignedGroups: true
      },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Reservations GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    
    // Check if event exists
    const event = await prisma.event.findUnique({
        where: { id: body.eventId }
    });

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Validacija telefona (BiH broj)
    if (!body.phone || !isValidBosnianPhone(String(body.phone))) {
        return NextResponse.json({ error: 'Unesite ispravan broj telefona (npr. +387 66 123 456 ili 066 123 456).' }, { status: 400 });
    }

    const reservation = await prisma.reservation.create({
      data: {
        eventId: body.eventId,
        venueId: event.venueId,
        userId: session?.user?.id || null,
        name: body.name,
        email: body.email,
        phone: body.phone,
        numberOfPeople: parseInt(body.numberOfPeople),
        startTime: new Date(body.startTime),
        notes: body.notes,
        status: 'PENDING'
      }
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error('Reservation POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        const body = await request.json();
        const { id, status } = body;

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id },
            include: { venue: true, event: true }
        });

        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        // Authorization
        const isAdmin = session.user.role === 'ADMIN';
        const isVenueOwner = reservation.venue.ownerId === session.user.id;
        const isReservationOwner = reservation.userId === session.user.id;

        if (!isAdmin && !isVenueOwner && !isReservationOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Obični korisnik može samo OTKAZATI svoju rezervaciju,
        // i to isključivo dok događaj nije počeo.
        if (!isAdmin && !isVenueOwner) {
            if (status !== 'CANCELLED') {
                return NextResponse.json({ error: 'Nemate dozvolu za ovu akciju.' }, { status: 403 });
            }
            if (new Date(reservation.event.startDateTime) <= new Date()) {
                return NextResponse.json(
                    { error: 'Događaj je već počeo — otkazivanje više nije moguće.' },
                    { status: 400 }
                );
            }
        }

        const updated = await prisma.reservation.update({
            where: { id },
            data: { status }
        });

        // If cancelled or no-show, free up tables
        if (status === 'CANCELLED' || status === 'NO_SHOW') {
            await prisma.eventFloorItem.updateMany({
                where: { reservationId: id },
                data: { status: 'AVAILABLE', reservationId: null }
            });
            await prisma.eventTableGroup.updateMany({
                where: { reservationId: id },
                data: { reservationId: null }
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Reservation PATCH Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
