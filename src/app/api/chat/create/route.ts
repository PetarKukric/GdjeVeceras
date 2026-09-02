import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Provjera da korisnik postoji — čista greška umjesto 500
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Ne možete započeti razgovor sa samim sobom.' }, { status: 400 });
    }
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Korisnik nije pronađen.' }, { status: 404 });
    }

    // Check if a conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: session.user.id } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
    });

    if (existingConversation) {
      return NextResponse.json({ id: existingConversation.id });
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [
            { userId: session.user.id },
            { userId: targetUserId },
          ],
        },
      },
    });

    return NextResponse.json({ id: newConversation.id }, { status: 201 });
  } catch (error) {
    console.error('Chat Create Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
