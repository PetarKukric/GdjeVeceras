import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    console.log('Session API: Current session:', session);
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json({ ...session, user: { ...session.user, emailVerified: !!user.emailVerified } });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
