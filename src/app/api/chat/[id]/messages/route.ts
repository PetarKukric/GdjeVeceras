import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id: conversationId } = await params;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Security check: is the user a participant?
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark messages as read
    await prisma.chatMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    const messages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        sharedEvent: {
          include: { venue: true }
        },
        sharedVenue: {
          include: { openingHours: true }
        }
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Messages GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id: conversationId } = await params;
    const { content, type, sharedEventId, sharedVenueId } = await request.json();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    // Security check
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: session.user.id,
      },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if blocked
    const otherParticipantId = participant.conversation.participants.find(p => p.userId !== session.user.id)?.userId;
    if (otherParticipantId) {
      const isBlocked = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: session.user.id, blockedId: otherParticipantId },
            { blockerId: otherParticipantId, blockedId: session.user.id },
          ]
        }
      });

      if (isBlocked) {
        return NextResponse.json({ error: 'Slanje poruke nije moguće.' }, { status: 403 });
      }
    }

    const newMessage = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content: content.trim(),
        type: type || 'TEXT',
        sharedEventId,
        sharedVenueId,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        sharedEvent: { include: { venue: true } },
        sharedVenue: { include: { openingHours: true } }
      }
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Create a notification for the other user
    if (otherParticipantId) {
        await prisma.notification.create({
            data: {
                userId: otherParticipantId,
                type: 'NEW_CHAT_MESSAGE',
                content: `Nova poruka od ${session.user.name}`,
                // In a more robust system, we'd link to the chat specifically
            }
        });
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Messages POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
