import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Status } from '@prisma/client';
import { getSession } from '@/lib/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Samo admin može ovo da uradi' }, { status: 403 });
    }

    const { id, action } = await params;
    
    let newStatus: Status;
    
    switch (action) {
      case 'approve':
        newStatus = Status.PUBLISHED;
        break;
      case 'reject':
        newStatus = Status.REJECTED;
        break;
      case 'cancel':
        newStatus = Status.CANCELLED;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json(event);
  } catch (_unused) {
    console.error("API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
