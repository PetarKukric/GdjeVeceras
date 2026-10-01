import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!rateLimit(`user-search:${session.user.id}`, 60, 60_000).ok) {
      return NextResponse.json([], { status: 429 });
    }
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              // Email samo kao tačno poklapanje — djelimična pretraga bi otkrivala ko je registrovan
              { email: query.trim().toLowerCase() },
            ],
          },
          {
            id: { not: session.user.id },
            restricted: false,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('User Search Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
