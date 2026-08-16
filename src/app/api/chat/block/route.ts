import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetUserId,
        },
      },
    });

    if (existingBlock) {
      // Unblock
      await prisma.block.delete({
        where: { id: existingBlock.id },
      });
      return NextResponse.json({ blocked: false });
    } else {
      // Block
      await prisma.block.create({
        data: {
          blockerId: session.user.id,
          blockedId: targetUserId,
        },
      });
      return NextResponse.json({ blocked: true });
    }
  } catch (error) {
    console.error('Chat Block Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
