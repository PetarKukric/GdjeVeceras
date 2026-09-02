import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { resolveOccurrence, toExceptionMap } from '@/lib/recurrence';
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
    console.log(`Automatski obrisano ${deleted.count} rezervacija za prošle događaje.`);
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

    // Obični korisnici vide samo svoje rezervacije
    if (session.user.role !== 'ADMIN') {
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
    if (!session) {
      return NextResponse.json({ error: 'Prijavi se da bi napravio rezervaciju.' }, { status: 401 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;
    const body = await request.json();
    
    // Check if event exists
    const event = await prisma.event.findUnique({
        where: { id: body.eventId }
    });

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Rezervacije moraju biti omogućene za lokal (admin/owner ih uključuje po lokalu)
    const venueForRes = await prisma.venue.findUnique({
        where: { id: event.venueId },
        select: { reservationsEnabled: true },
    });
    if (!venueForRes?.reservationsEnabled) {
        return NextResponse.json({ error: 'Ovaj lokal ne prima rezervacije.' }, { status: 403 });
    }

    // ===== PONAVLJAJUĆI DOGAĐAJ: rezervacija pripada JEDNOM terminu =====
    // (eventId + occurrenceDate; rezervacija za 11.09 ne vrijedi za 12.09)
    let occurrenceDate: string | null = null;
    if ((event as any).isRecurring) {
        occurrenceDate = typeof body.occurrenceDate === 'string' ? body.occurrenceDate : null;
        if (!occurrenceDate || !/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
            return NextResponse.json({ error: 'Nedostaje datum termina za ponavljajući događaj.' }, { status: 400 });
        }
        const exceptions = await prisma.eventOccurrenceException.findMany({ where: { parentEventId: event.id } });
        const occurrence = resolveOccurrence(event as any, occurrenceDate, toExceptionMap(exceptions as any));
        if (!occurrence) {
            return NextResponse.json({ error: 'Termin ne postoji ili je otkazan.' }, { status: 400 });
        }
        // vrijeme početka = početak tog termina (uključujući override)
        body.startTime = occurrence.startDateTime;
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
        occurrenceDate,
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
