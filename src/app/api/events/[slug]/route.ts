import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { resolveOccurrence, toExceptionMap } from '@/lib/recurrence';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const slug = (await params).slug;
    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        venue: {
          include: {
            openingHours: true,
            tags: true,
            _count: {
              select: { events: true }
            }
          }
        },
        additionalVenues: {
          include: {
            venue: {
              select: { id: true, name: true, city: true, slug: true, address: true, latitude: true, longitude: true, imageUrl: true }
            }
          }
        },
        _count: {
          select: { comments: true, favorites: true, liveMedia: true }
        }
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ===== PONAVLJAJUĆI DOGAĐAJ: riješi konkretan termin iz ?date=YYYY-MM-DD =====
    // Vraća termine-specifične startDateTime/endDateTime/title + occurrenceDate/isOccurrence.
    let responseEvent: any = event;
    const dateParam = _request.nextUrl?.searchParams?.get('date') || new URL(_request.url).searchParams.get('date');
    if (dateParam && (event as any).isRecurring) {
      const exceptions = await prisma.eventOccurrenceException.findMany({
        where: { parentEventId: event.id },
      });
      const occurrence = resolveOccurrence(event as any, dateParam, toExceptionMap(exceptions as any));
      if (!occurrence) {
        return NextResponse.json({ error: 'Termin ne postoji ili je otkazan.' }, { status: 404 });
      }
      responseEvent = occurrence;
    }

    // Fetch related events
    const [venueEvents, similarEvents] = await Promise.all([
      // Other events at the same venue
      prisma.event.findMany({
        where: {
          venueId: event.venueId,
          id: { not: event.id },
          status: 'PUBLISHED',
          startDateTime: { gte: new Date() },
        },
        take: 3,
        include: { venue: true },
        orderBy: { startDateTime: 'asc' },
      }),
      // Similar category events
      prisma.event.findMany({
        where: {
          category: event.category,
          id: { not: event.id },
          venueId: { not: event.venueId },
          status: 'PUBLISHED',
          startDateTime: { gte: new Date() },
        },
        take: 6,
        include: { venue: true, _count: { select: { favorites: true } } },
        orderBy: { startDateTime: 'asc' },
      }),
    ]);

    let finalSimilar = similarEvents;

    if (session) {
      const userFavorites = await prisma.eventFavorite.findMany({
        where: { userId: session.user.id },
        include: { event: { select: { category: true, venueId: true } } }
      });

      const catFreq: Record<string, number> = {};
      const venueFreq: Record<string, number> = {};
      userFavorites.forEach(f => {
        catFreq[f.event.category] = (catFreq[f.event.category] || 0) + 1;
        venueFreq[f.event.venueId] = (venueFreq[f.event.venueId] || 0) + 1;
      });

      finalSimilar = similarEvents.map((e: any) => {
        let score = 0;
        if (catFreq[e.category]) score += catFreq[e.category] * 10;
        if (venueFreq[e.venueId]) score += venueFreq[e.venueId] * 5;
        score += (e._count.favorites || 0);
        
        let reason = '';
        if (catFreq[e.category] >= 2) reason = 'Slično događajima koje voliš';
        
        return { ...e, personalizationScore: score, recommendationReason: reason };
      })
      .sort((a: any, b: any) => b.personalizationScore - a.personalizationScore)
      .slice(0, 3);
    } else {
      finalSimilar = similarEvents.slice(0, 3);
    }

    return NextResponse.json({
      event: responseEvent,
      related: {
        venueEvents,
        similarEvents: finalSimilar,
      }
    });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const body = await _request.json();
    
    const event = await prisma.event.update({
      where: { slug },
      data: {
        ...body,
        startDateTime: body.startDateTime ? new Date(body.startDateTime) : undefined,
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : undefined,
      },
    });

    return NextResponse.json(event);
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    
    await prisma.event.delete({
      where: { slug },
    });

    return NextResponse.json({ message: 'Event deleted' });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
