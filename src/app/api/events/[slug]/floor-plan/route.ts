import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: eventSlug } = await params;
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: { 
        floorItems: {
            include: { group: true, reservation: true }
        },
        venue: { include: { floorItems: true } }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // If event has no floor items, initialize them from venue default
    if (event.floorItems.length === 0 && event.venue.floorItems.length > 0) {
        await prisma.eventFloorItem.createMany({
            data: event.venue.floorItems.map(item => ({
                eventId: event.id,
                sourceVenueFloorItemId: item.id,
                type: item.type,
                name: item.name,
                capacity: item.capacity,
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                rotation: item.rotation,
                status: 'AVAILABLE'
            }))
        });
        
        const initializedItems = await prisma.eventFloorItem.findMany({
            where: { eventId: event.id },
            include: { group: true, reservation: true }
        });
        return NextResponse.json(initializedItems);
    }

    return NextResponse.json(event.floorItems);
  } catch (error) {
    console.error('Event Floor Plan GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug: eventSlug } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: { venue: true }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, items, itemIds, reservationId, groupId } = body;

    if (action === 'savePositions') {
        for (const item of items) {
            await prisma.eventFloorItem.update({
                where: { id: item.id },
                data: { x: item.x, y: item.y, status: item.status }
            });
        }
        return NextResponse.json({ success: true });
    }

    if (action === 'resetToDefault') {
        await prisma.$transaction([
            prisma.eventTableGroup.deleteMany({ where: { eventId: event.id } }),
            prisma.eventFloorItem.deleteMany({ where: { eventId: event.id } }),
        ]);
        // Trigger initialization on next GET or just return initialized here
        const venue = await prisma.venue.findUnique({ 
            where: { id: event.venueId },
            include: { floorItems: true }
        });
        
        if (venue && venue.floorItems.length > 0) {
            await prisma.eventFloorItem.createMany({
                data: venue.floorItems.map(item => ({
                    eventId: event.id,
                    sourceVenueFloorItemId: item.id,
                    type: item.type,
                    name: item.name,
                    capacity: item.capacity,
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    rotation: item.rotation,
                    status: 'AVAILABLE'
                }))
            });
        }
        const resetItems = await prisma.eventFloorItem.findMany({
            where: { eventId: event.id },
            include: { group: true, reservation: true }
        });
        return NextResponse.json(resetItems);
    }

    if (action === 'merge') {
        const floorItems = await prisma.eventFloorItem.findMany({
            where: { id: { in: itemIds }, eventId: event.id }
        });

        if (floorItems.length < 2) return NextResponse.json({ error: 'Izaberite bar dva stola' }, { status: 400 });

        // Simple adjacency check: items must be within 100px of each other
        let isAdjacent = true;
        for (let i = 0; i < floorItems.length; i++) {
            let hasNeighbor = false;
            for (let j = 0; j < floorItems.length; j++) {
                if (i === j) continue;
                const dist = Math.sqrt(
                    Math.pow(floorItems[i].x - floorItems[j].x, 2) + 
                    Math.pow(floorItems[i].y - floorItems[j].y, 2)
                );
                if (dist < 150) { // Distance threshold
                    hasNeighbor = true;
                    break;
                }
            }
            if (!hasNeighbor) {
                isAdjacent = false;
                break;
            }
        }

        if (!isAdjacent) {
            return NextResponse.json({ error: 'Stolovi moraju biti susjedni da bi se spojili.' }, { status: 400 });
        }

        const totalCapacity = floorItems.reduce((acc, curr) => acc + curr.capacity, 0);
        const groupName = floorItems.map(i => i.name).join(' + ');

        const group = await prisma.eventTableGroup.create({
            data: {
                eventId: event.id,
                name: groupName,
                totalCapacity,
            }
        });

        await prisma.eventFloorItem.updateMany({
            where: { id: { in: itemIds } },
            data: { groupId: group.id }
        });

        return NextResponse.json(group);
    }

    if (action === 'split') {
        if (!groupId) return NextResponse.json({ error: 'Group ID required' }, { status: 400 });
        
        await prisma.eventFloorItem.updateMany({
            where: { groupId },
            data: { groupId: null }
        });

        await prisma.eventTableGroup.delete({ where: { id: groupId } });

        return NextResponse.json({ success: true });
    }

    if (action === 'assignReservation') {
        if (!reservationId) return NextResponse.json({ error: 'Reservation ID required' }, { status: 400 });
        
        // PROMJENA STOLA: prvo oslobodi sve prethodne dodjele ove rezervacije
        // koje nisu među novim izborom (sto 1 → sto 2)
        const newItemIds = new Set<string>(itemIds || []);
        const existingAssigned = await prisma.eventFloorItem.findMany({
            where: { reservationId },
            select: { id: true, groupId: true }
        });
        const toFree = existingAssigned
            .filter(i => !newItemIds.has(i.id))
            .map(i => i.id);
        if (toFree.length > 0) {
            await prisma.eventFloorItem.updateMany({
                where: { id: { in: toFree } },
                data: { status: 'AVAILABLE', reservationId: null }
            });
        }
        // Oslobodi i grupe ove rezervacije koje nisu nove
        await prisma.eventTableGroup.updateMany({
            where: { reservationId, id: groupId ? { not: groupId } : undefined },
            data: { reservationId: null }
        });
        
        if (groupId) {
            await prisma.$transaction([
                prisma.eventTableGroup.update({
                    where: { id: groupId },
                    data: { reservationId }
                }),
                prisma.eventFloorItem.updateMany({
                    where: { groupId },
                    data: { status: 'RESERVED', reservationId }
                })
            ]);
        } else if (itemIds && itemIds.length > 0) {
            await prisma.eventFloorItem.updateMany({
                where: { id: { in: itemIds } },
                data: { status: 'RESERVED', reservationId }
            });
        }
        
        await prisma.reservation.update({
            where: { id: reservationId },
            data: { status: 'CONFIRMED' }
        });

        return NextResponse.json({ success: true });
    }

    if (action === 'updateStatus') {
        const { status, itemId, groupId } = body;
        if (groupId) {
            await prisma.eventFloorItem.updateMany({
                where: { groupId },
                data: { status }
            });
        } else if (itemId) {
            await prisma.eventFloorItem.update({
                where: { id: itemId },
                data: { status }
            });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Event Floor Plan POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
