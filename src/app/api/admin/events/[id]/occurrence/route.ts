import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { resolveOccurrence, toExceptionMap } from '@/lib/recurrence';

/**
 * Otkaži / vrati JEDAN termin ponavljajućeg događaja (bez brisanja serije).
 * POST { occurrenceDate: 'YYYY-MM-DD', action: 'cancel' | 'restore' }
 */
export async function POST(
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
    const occurrenceDate = String(body.occurrenceDate || '');
    const action = body.action === 'restore' ? 'restore' : 'cancel';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurrenceDate)) {
      return NextResponse.json({ error: 'Neispravan datum termina.' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id }, include: { venue: { select: { ownerId: true } } } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    if (!(event as any).isRecurring) {
      return NextResponse.json({ error: 'Ovo nije ponavljajući događaj.' }, { status: 400 });
    }

    // Owner smije samo svoj lokal
    if (session.user.role === 'OWNER' && event.venue?.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exceptions = await prisma.eventOccurrenceException.findMany({ where: { parentEventId: id } });
    const exMap = toExceptionMap(exceptions as any);
    const existingEx = exMap[occurrenceDate];

    if (action === 'cancel') {
      // termin mora zaista postojati po pravilu (ignoriši postojeće otkazanje pri provjeri)
      const occurrence = resolveOccurrence(event as any, occurrenceDate, {});
      if (!occurrence) {
        return NextResponse.json({ error: 'Termin ne postoji po pravilu ponavljanja.' }, { status: 400 });
      }
      if (existingEx?.isCancelled) {
        return NextResponse.json({ error: 'Termin je već otkazan.' }, { status: 400 });
      }
    } else {
      if (!existingEx?.isCancelled) {
        return NextResponse.json({ error: 'Nema otkazanog termina za vraćanje.' }, { status: 400 });
      }
    }

    const exception = await prisma.eventOccurrenceException.upsert({
      where: { parentEventId_occurrenceDate: { parentEventId: id, occurrenceDate } },
      create: { parentEventId: id, occurrenceDate, isCancelled: action === 'cancel' },
      update: { isCancelled: action === 'cancel' },
    });

    return NextResponse.json({ message: action === 'cancel' ? 'Termin otkazan.' : 'Termin vraćen.', exception });
  } catch (error) {
    console.error('Occurrence action error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
