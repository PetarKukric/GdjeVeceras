import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [
      totalEvents,
      published,
      pending,
      cancelled,
      users,
      totalReports,
      pendingReports,
      recentEvents
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({ where: { status: 'PUBLISHED' } }),
      prisma.event.count({ where: { status: 'PENDING' } }),
      prisma.event.count({ where: { status: 'CANCELLED' } }),
      prisma.user.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.event.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { venue: true }
      })
    ]);

    const upcoming = await prisma.event.count({
      where: {
        status: 'PUBLISHED',
        startDateTime: { gte: new Date() }
      }
    });

    return NextResponse.json({
      totalEvents,
      published,
      pending,
      cancelled,
      upcoming,
      users,
      reports: totalReports,
      pendingReports,
      recentEvents
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
