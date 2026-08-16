import {  NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let messages;

    if (session.user.role === 'ADMIN') {
      // Admins see all messages
      messages = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          venue: true,
          sender: {
            select: { name: true, email: true }
          }
        }
      });
    } else if (session.user.role === 'OWNER') {
      // Owners see messages for their venues
      messages = await prisma.message.findMany({
        where: {
          venue: {
            ownerId: session.user.id
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          venue: true,
          sender: {
            select: { name: true, email: true }
          }
        }
      });
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
