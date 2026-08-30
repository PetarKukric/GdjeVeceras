import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { resolveOccurrence, toExceptionMap, validateRecurrenceInput } from '@/lib/recurrence';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: { venue: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Završeni događaji se ne mogu uređivati — samo brisati
    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!(existingEvent as any).isRecurring && existingEvent.endDateTime && new Date(existingEvent.endDateTime) < new Date()) {
      return NextResponse.json({ error: 'Događaj je završen — uređivanje nije moguće.' }, { status: 400 });
    }
    
    if (body.dressCodeType === 'SPECIAL' && !body.dressCodeName) {
      return NextResponse.json({ error: 'Naziv dress code-a je obavezan za specijalni tip.' }, { status: 400 });
    }

    // If owner, verify they own the venue
    if (session.user.role === 'OWNER') {
        const event = await prisma.event.findUnique({ where: { id } });
        const venue = await prisma.venue.findFirst({ where: { id: event?.venueId, ownerId: session.user.id } });
        if (!venue) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ===== UREDI SAMO JEDAN TERMIN ponavljajućeg događaja =====
    // Ne dira pravilo ponavljanja — upisuje izuzetak za taj datum.
    if (body.editOccurrenceOnly && (existingEvent as any).isRecurring) {
      const occurrenceDate = String(body.occurrenceDate || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
        return NextResponse.json({ error: 'Neispravan datum termina.' }, { status: 400 });
      }
      const exceptions = await prisma.eventOccurrenceException.findMany({ where: { parentEventId: id } });
      const occurrence = resolveOccurrence(existingEvent as any, occurrenceDate, toExceptionMap(exceptions as any));
      if (!occurrence) {
        return NextResponse.json({ error: 'Termin ne postoji ili je otkazan.' }, { status: 400 });
      }
      const updatedException = await prisma.eventOccurrenceException.upsert({
        where: { parentEventId_occurrenceDate: { parentEventId: id, occurrenceDate } },
        create: {
          parentEventId: id,
          occurrenceDate,
          title: body.title || null,
          performers: body.performers || null,
          startDateTime: body.startDateTime ? new Date(body.startDateTime) : null,
          endDateTime: body.endDateTime ? new Date(body.endDateTime) : null,
        },
        update: {
          title: body.title || null,
          performers: body.performers || null,
          startDateTime: body.startDateTime ? new Date(body.startDateTime) : null,
          endDateTime: body.endDateTime ? new Date(body.endDateTime) : null,
        },
      });
      return NextResponse.json({ message: 'Termin izmijenjen.', exception: updatedException });
    }

    // Dodatni lokali (zajednički događaj)
    let additionalVenueIds: string[] = [];
    if (Array.isArray(body.additionalVenueIds)) {
      const unique: string[] = Array.from(new Set((body.additionalVenueIds as any[]).filter((v: any) => v && v !== body.venueId)));
      if (unique.length > 0) {
        const found = await prisma.venue.findMany({ where: { id: { in: unique } }, select: { id: true } });
        additionalVenueIds = found.map((v) => v.id);
      }
    }

    // Pravilo ponavljanja (serija) — validacija na serveru
    const recurrence = validateRecurrenceInput(body);
    if (recurrence.error) {
      return NextResponse.json({ error: recurrence.error }, { status: 400 });
    }
    if (body.isRecurring === false) {
      // serija isključena → obriši izuzetke (nema više termina)
      await prisma.eventOccurrenceException.deleteMany({ where: { parentEventId: id } });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...recurrence.data,
        title: body.title,
        description: body.description,
        category: body.category,
        venueId: body.venueId,
        startDateTime: new Date(body.startDateTime),
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : undefined,
        price: body.price,
        imageUrl: body.imageUrl,
        performers: body.performers,
        minimumAge: body.minimumAge ? parseInt(body.minimumAge) : null,
        ticketUrl: body.ticketUrl || null,
        instagramUrl: body.instagramUrl || null,
        facebookUrl: body.facebookUrl || null,
        dressCodeType: body.dressCodeType || 'NONE',
        dressCodeName: body.dressCodeName || null,
        dressCodeDescription: body.dressCodeDescription || null,
        status: body.status,
      },
    });

    // Zamijeni listu dodatnih lokala
    await prisma.eventVenue.deleteMany({ where: { eventId: id } });
    if (additionalVenueIds.length > 0) {
      await prisma.eventVenue.createMany({
        data: additionalVenueIds.map((vid) => ({ eventId: id, venueId: vid })),
      });
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Event Update Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    
    await prisma.event.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Event deleted' });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
