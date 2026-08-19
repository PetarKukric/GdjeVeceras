import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Status } from '@prisma/client';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const status = searchParams.get('status') as Status | null;

    const where: any = {};
    
    // Authorization filter
    if (session.user.role === 'OWNER') {
      where.venue = { ownerId: session.user.id };
    }

    if (status) {
      where.status = status;
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: true,
        additionalVenues: { include: { venue: { select: { id: true, name: true, city: true } } } },
        createdBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(events);
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
