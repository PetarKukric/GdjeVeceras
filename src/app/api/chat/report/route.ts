import { NextRequest, NextResponse } from 'next/server';
import { rateLimit  } from '@/lib/rate-limit';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!rateLimit(`chat-report:${session.user.id}`, 10, 10 * 60_000).ok) {
      return NextResponse.json({ error: 'Previše zahtjeva. Sačekaj par minuta.' }, { status: 429 });
    }

    const { targetId, reason, details } = await request.json();

    if (!targetId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.chatReport.create({
      data: {
        userId: session.user.id,
        targetId,
        reason,
        details,
      },
    });

    return NextResponse.json({ message: 'Prijava uspješno poslata.' }, { status: 201 });
  } catch (error) {
    console.error('Chat Report Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
