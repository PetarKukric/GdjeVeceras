import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        venue: true,
        sender: {
          select: { name: true, email: true }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Authorization
    let isAuthorized = false;
    if (session.user.role === 'ADMIN') {
      isAuthorized = true;
    } else if (session.user.role === 'OWNER') {
      if (message.venue?.ownerId === session.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as read
    await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Message GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
