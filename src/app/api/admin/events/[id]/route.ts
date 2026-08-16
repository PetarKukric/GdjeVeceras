import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
    if (existingEvent.endDateTime && new Date(existingEvent.endDateTime) < new Date()) {
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

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        venueId: body.venueId,
        startDateTime: new Date(body.startDateTime),
        endDateTime: body.endDateTime ? new Date(body.endDateTime) : undefined,
        price: body.price,
        imageUrl: body.imageUrl,
        performers: body.performers,
        dressCodeType: body.dressCodeType || 'NONE',
        dressCodeName: body.dressCodeName || null,
        dressCodeDescription: body.dressCodeDescription || null,
        status: body.status,
      },
    });

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
