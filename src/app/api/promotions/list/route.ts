import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.user.role !== 'OWNER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = {};
    if (session.user.role === 'OWNER') {
      where.ownerId = session.user.id;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        venue: { select: { name: true, slug: true } },
        event: { select: { title: true, slug: true } },
        owner: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Promotions List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
