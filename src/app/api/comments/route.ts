import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const venueId = searchParams.get('venueId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    if (!eventId && !venueId) {
      return NextResponse.json({ error: 'Missing eventId or venueId' }, { status: 400 });
    }

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (venueId) where.venueId = venueId;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return NextResponse.json({
      comments,
      total,
      hasMore: total > page * limit,
    });
  } catch (error) {
    console.error('Comments GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Morate biti prijavljeni da biste ostavili komentar.' }, { status: 401 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;

    const body = await request.json();
    const { content, eventId, venueId } = body;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Komentar ne može biti prazan.' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Komentar može imati najviše 1000 karaktera.' }, { status: 400 });
    }

    if ((!eventId && !venueId) || (eventId && venueId)) {
      return NextResponse.json({ error: 'Komentar mora pripadati ili događaju ili lokalu.' }, { status: 400 });
    }

    // Provjera da cilj postoji — čista greška umjesto 500 kod nepostojećeg ID-a
    if (eventId) {
      const target = await prisma.event.findUnique({ where: { id: eventId } });
      if (!target) {
        return NextResponse.json({ error: 'Događaj nije pronađen.' }, { status: 404 });
      }
    }
    if (venueId) {
      const target = await prisma.venue.findUnique({ where: { id: venueId } });
      if (!target) {
        return NextResponse.json({ error: 'Lokal nije pronađen.' }, { status: 404 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        eventId: eventId || null,
        venueId: venueId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comment POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
