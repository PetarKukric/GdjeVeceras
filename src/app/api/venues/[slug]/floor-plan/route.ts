import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      include: { floorItems: true }
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json(venue.floorItems);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    const { slug } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venue = await prisma.venue.findUnique({
      where: { slug },
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    if (venue.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body; // Array of floor items

    // Update default floor plan by replacing all items
    await prisma.$transaction([
      prisma.venueFloorItem.deleteMany({ where: { venueId: venue.id } }),
      prisma.venueFloorItem.createMany({
        data: items.map((item: any) => ({
          venueId: venue.id,
          type: item.type,
          name: item.name,
          capacity: item.capacity || 0,
          x: item.x,
          y: item.y,
          width: item.width || 60,
          height: item.height || 60,
          rotation: item.rotation || 0,
        }))
      })
    ]);

    const updatedItems = await prisma.venueFloorItem.findMany({
      where: { venueId: venue.id }
    });

    return NextResponse.json(updatedItems);
  } catch (error) {
    console.error('Floor Plan POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
