import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAndArchiveFinishedEvents } from '@/lib/live-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    
    // Background archive check
    await checkAndArchiveFinishedEvents();

    const venue = await prisma.venue.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { createdAt: 'desc' },
          include: { event: { select: { title: true, startDateTime: true } } }
        },
        openingHours: true,
        tags: true,
        _count: {
          select: { events: true, comments: true }
        }
      },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Događaji lokala: primarni lokal ILI zajednički (additionalVenues)
    const events = await prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { venueId: venue.id },
          { additionalVenues: { some: { venueId: venue.id } } },
        ],
      },
      orderBy: { startDateTime: 'asc' },
      include: {
        venue: true,
        additionalVenues: { include: { venue: { select: { id: true, name: true, slug: true, city: true } } } },
      },
    });

    return NextResponse.json({ ...venue, events });
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { getSession } from '@/lib/auth';

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const slug = (await params).slug;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingVenue = await prisma.venue.findUnique({
      where: { slug }
    });

    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    // Auth check: Admin can edit anything, Owner can only edit their own venue
    if (session.user.role !== 'ADMIN' && existingVenue.ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await _request.json();
    
    // Update venue and its related hours/tags
    const venue = await prisma.$transaction(async (tx) => {
      // Delete old hours and tags if they are provided in body
      if (body.openingHours) {
        await tx.venueOpeningHour.deleteMany({ where: { venueId: existingVenue.id } });
      }
      if (body.tags) {
        await tx.venueTag.deleteMany({ where: { venueId: existingVenue.id } });
      }

      // Convert empty ownerId string to null
      const ownerId = body.ownerId === "" ? null : (body.ownerId || existingVenue.ownerId);

      return await tx.venue.update({
        where: { slug },
        data: {
          name: body.name,
          description: body.description,
          address: body.address,
          city: body.city,
          latitude: body.latitude,
          longitude: body.longitude,
          phone: body.phone,
          website: body.website,
          instagramUrl: body.instagramUrl,
          facebookUrl: body.facebookUrl,
          tiktokUrl: body.tiktokUrl,
          reservationsEnabled: body.reservationsEnabled === undefined ? undefined : !!body.reservationsEnabled,
          imageUrl: body.imageUrl,
          ownerId: ownerId,
          openingHours: body.openingHours ? {
            create: body.openingHours.map((h: any) => ({
              dayGroup: h.dayGroup,
              openTime: h.openTime,
              closeTime: h.closeTime,
              isClosed: h.isClosed
            }))
          } : undefined,
          tags: body.tags ? {
            create: body.tags.map((t: string) => ({ name: t }))
          } : undefined
        },
      });
    });

    if (body.ownerId) {
      await prisma.user.update({
        where: { id: body.ownerId },
        data: { role: 'OWNER' }
      });
    }

    return NextResponse.json(venue);
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
    
    const venue = await prisma.venue.findUnique({ 
        where: { slug },
        include: { events: true } 
    });
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const eventIds = venue.events.map(e => e.id);

    // Manual cleanup for relations that might cause P2003 in SQLite if not properly cascaded
    await prisma.$transaction([
        // Cleanup for all events of this venue
        prisma.eventFavorite.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.report.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.comment.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.notification.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventLiveMedia.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventFloorItem.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.eventTableGroup.deleteMany({ where: { eventId: { in: eventIds } } }),
        prisma.reservation.deleteMany({ where: { eventId: { in: eventIds } } }),
        
        // Cleanup for venue itself
        prisma.venueFavorite.deleteMany({ where: { venueId: venue.id } }),
        prisma.venueOpeningHour.deleteMany({ where: { venueId: venue.id } }),
        prisma.venueTag.deleteMany({ where: { venueId: venue.id } }),
        prisma.venueImage.deleteMany({ where: { venueId: venue.id } }),
        prisma.message.deleteMany({ where: { venueId: venue.id } }),
        prisma.venueFloorItem.deleteMany({ where: { venueId: venue.id } }),
        prisma.reservation.deleteMany({ where: { venueId: venue.id } }),
        prisma.comment.deleteMany({ where: { venueId: venue.id } }),

        // Finally delete events and venue
        prisma.event.deleteMany({ where: { venueId: venue.id } }),
        prisma.venue.delete({ where: { id: venue.id } }),
    ]);

    return NextResponse.json({ message: 'Venue and all related data deleted' });
  } catch (error) {
    console.error("Delete Venue Error", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
