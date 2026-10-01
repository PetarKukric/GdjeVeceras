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
    if (!rateLimit(`chat-global-report:${session.user.id}`, 10, 10 * 60_000).ok) {
      return NextResponse.json({ error: 'Previše zahtjeva. Sačekaj par minuta.' }, { status: 429 });
    }

    const { messageId, reason } = await request.json();

    if (!messageId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use existing ChatReport model
    await prisma.chatReport.create({
      data: {
        userId: session.user.id,
        targetId: messageId,
        reason: reason,
        details: `Prijavljena poruka u Global Chatu`,
      },
    });

    return NextResponse.json({ message: 'Poruka je prijavljena.' }, { status: 201 });
  } catch (error) {
    console.error('Global Chat Report Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
