import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [eventReports, otherReports] = await Promise.all([
      prisma.report.findMany({
        include: {
          user: { select: { name: true, email: true } },
          event: { select: { title: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatReport.findMany({
        include: {
          user: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
      })
    ]);

    // Map other reports to a similar format
    const formattedOtherReports = otherReports.map(r => ({
      ...r,
      type: 'OTHER',
      event: { title: r.details || 'Chat/Komentar', slug: '#' }
    }));

    const allReports = [...eventReports.map(r => ({...r, type: 'EVENT'})), ...formattedOtherReports]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(allReports);
  } catch (_unused) {
    console.error("Reports GET API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, userId, reason, description } = body;
    
    if (!eventId || !userId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        eventId,
        userId,
        reason,
        description,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (_unused) {
    console.error("Reports POST API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
