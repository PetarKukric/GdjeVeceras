import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: session.user.id },
                readAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format the response to make it easier for the frontend
    const formattedConversations = conversations.map((conv) => {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== session.user.id
      )?.user;
      
      return {
        id: conv.id,
        updatedAt: conv.updatedAt,
        otherUser: otherParticipant,
        lastMessage: conv.messages[0] || null,
        unreadCount: conv._count.messages,
      };
    });

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Chat List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
