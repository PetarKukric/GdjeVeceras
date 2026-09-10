import prisma from '@/lib/prisma';
import { getCityBySlug } from '@/lib/cities';
import { getSarajevoNow, sarajevoStartOfDay } from '@/lib/bosnia-time';
import { resolveOccurrence, toExceptionMap, expandRecurringEvent } from '@/lib/recurrence';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateRange(dateFilter: string) {
  const sarajevoNow = getSarajevoNow();
  const today = sarajevoStartOfDay(sarajevoNow);

  if (dateFilter === 'tomorrow') {
    return { gte: new Date(today.getTime() + DAY_MS), lte: new Date(today.getTime() + 2 * DAY_MS - 1) };
  }
  if (dateFilter === 'weekend') {
    const day = sarajevoNow.getUTCDay();
    const daysToFriday = day === 6 ? -1 : day === 0 ? -2 : 5 - day;
    const fridayLocal = new Date(sarajevoNow);
    fridayLocal.setUTCDate(fridayLocal.getUTCDate() + daysToFriday);
    const friday = sarajevoStartOfDay(fridayLocal);
    return { gte: friday, lte: new Date(friday.getTime() + 3 * DAY_MS - 1) };
  }
  if (dateFilter === 'upcoming') {
    return { gte: new Date(), lte: new Date(Date.now() + 60 * DAY_MS) };
  }
  return { gte: today, lte: new Date(today.getTime() + DAY_MS - 1) };
}

/** Početni javni sadržaj za SSR. Klijentski API zatim uključuje i ponavljajuće termine. */
export async function getInitialPublicEvents(citySlug: string, dateFilter: string, limit = 12) {
  const city = getCityBySlug(citySlug);
  const range = dateRange(dateFilter);

  const ordinary = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      isRecurring: false,
      startDateTime: range,
      ...(city ? { venue: { city: city.name } } : {}),
    },
    include: {
      venue: { include: { openingHours: true } },
      additionalVenues: {
        include: {
          venue: { select: { id: true, name: true, city: true, slug: true, address: true } },
        },
      },
      _count: { select: { favorites: true, liveMedia: true } },
    },
    orderBy: { startDateTime: 'asc' },
    take: limit,
  });
  const recurring = await prisma.event.findMany({
    where: { status: 'PUBLISHED', isRecurring: true, ...(city ? { venue: { city: city.name } } : {}) },
    include: { venue: { include: { openingHours: true } }, occurrenceExceptions: true, _count: { select: { favorites: true, liveMedia: true } } },
    take: 200,
  });
  const occurrences = recurring.flatMap(event => expandRecurringEvent(event, range.gte, range.lte, toExceptionMap(event.occurrenceExceptions)));
  return [...ordinary, ...occurrences].sort((a,b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()).slice(0,limit);
}

export async function getPublicEventDetails(slug: string, occurrenceDate?: string, userId?: string) {
  const event = await prisma.event.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      venue: {
        include: { openingHours: true, tags: true, _count: { select: { events: true } } },
      },
      additionalVenues: {
        include: {
          venue: {
            select: { id: true, name: true, city: true, slug: true, address: true, latitude: true, longitude: true, imageUrl: true },
          },
        },
      },
      _count: { select: { comments: true, favorites: true, liveMedia: true } },
    },
  });

  if (!event) return null;

  let responseEvent: any = event;
  if (occurrenceDate && (event as any).isRecurring) {
    const exceptions = await prisma.eventOccurrenceException.findMany({ where: { parentEventId: event.id } });
    responseEvent = resolveOccurrence(event as any, occurrenceDate, toExceptionMap(exceptions as any));
    if (!responseEvent) return null;
  }

  const [venueEvents, similarEvents, userFavorites] = await Promise.all([
    prisma.event.findMany({
      where: { venueId: event.venueId, id: { not: event.id }, status: 'PUBLISHED', startDateTime: { gte: new Date() } },
      take: 3,
      include: { venue: true },
      orderBy: { startDateTime: 'asc' },
    }),
    prisma.event.findMany({
      where: { category: event.category, id: { not: event.id }, venueId: { not: event.venueId }, status: 'PUBLISHED', startDateTime: { gte: new Date() } },
      take: 3,
      include: { venue: true, _count: { select: { favorites: true } } },
      orderBy: { startDateTime: 'asc' },
    }),
    userId
      ? prisma.eventFavorite.findMany({
          where: { userId },
          include: { event: { select: { category: true, venueId: true } } },
        })
      : Promise.resolve([]),
  ]);

  const categoryFrequency: Record<string, number> = {};
  const venueFrequency: Record<string, number> = {};
  for (const favorite of userFavorites) {
    categoryFrequency[favorite.event.category] = (categoryFrequency[favorite.event.category] || 0) + 1;
    venueFrequency[favorite.event.venueId] = (venueFrequency[favorite.event.venueId] || 0) + 1;
  }
  const rankedSimilar = similarEvents
    .map((item: any) => ({
      ...item,
      personalizationScore: (categoryFrequency[item.category] || 0) * 10 + (venueFrequency[item.venueId] || 0) * 5 + (item._count?.favorites || 0),
      recommendationReason: (categoryFrequency[item.category] || 0) >= 2 ? 'Slično događajima koje voliš' : '',
    }))
    .sort((a: any, b: any) => b.personalizationScore - a.personalizationScore);

  return { event: responseEvent, related: { venueEvents, similarEvents: rankedSimilar } };
}
