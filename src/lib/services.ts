import prisma from './prisma';
import {  Venue, EventDetailsResponse } from '@/types';

export async function getEventBySlug(slug: string): Promise<EventDetailsResponse | null> {
  const eventData = await prisma.event.findUnique({
    where: { slug },
    include: {
      venue: {
        include: {
          _count: {
            select: { events: true }
          }
        }
      },
    },
  });

  if (!eventData) return null;

  // Fetch related events
  const [venueEvents, similarEvents] = await Promise.all([
    prisma.event.findMany({
      where: {
        venueId: eventData.venueId,
        id: { not: eventData.id },
        status: 'PUBLISHED',
        startDateTime: { gte: new Date() },
      },
      take: 3,
      include: { venue: true },
      orderBy: { startDateTime: 'asc' },
    }),
    prisma.event.findMany({
      where: {
        category: eventData.category,
        id: { not: eventData.id },
        venueId: { not: eventData.venueId },
        status: 'PUBLISHED',
        startDateTime: { gte: new Date() },
      },
      take: 3,
      include: { venue: true },
      orderBy: { startDateTime: 'asc' },
    }),
  ]);

  return {
    event: JSON.parse(JSON.stringify(eventData)),
    related: {
      venueEvents: JSON.parse(JSON.stringify(venueEvents)),
      similarEvents: JSON.parse(JSON.stringify(similarEvents)),
    }
  };
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const venueData = await prisma.venue.findUnique({
    where: { slug },
    include: {
      events: {
        where: { 
          status: 'PUBLISHED',
          startDateTime: { gte: new Date() }
        },
        include: { venue: true },
        orderBy: { startDateTime: 'asc' },
      },
      _count: {
        select: { events: true }
      }
    },
  });

  if (!venueData) return null;

  return JSON.parse(JSON.stringify(venueData));
}

export async function getUserReservations(userId: string) {
  return await prisma.reservation.findMany({
    where: { userId },
    include: {
        event: true,
        venue: true
    },
    orderBy: { startTime: 'desc' }
  });
}
