import { NextRequest, NextResponse } from 'next/server';
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

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          {
            id: { not: session.user.id },
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
