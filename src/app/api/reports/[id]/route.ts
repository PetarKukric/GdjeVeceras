import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Try deleting from event reports first
    try {
      await prisma.report.delete({
        where: { id },
      });
      return NextResponse.json({ message: 'Report deleted' });
    } catch {
      // If not found, try chat reports
      await prisma.chatReport.delete({
        where: { id },
      });
      return NextResponse.json({ message: 'Report deleted' });
    }
  } catch (_unused) {
    console.error("Report DELETE API Error", _unused);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
