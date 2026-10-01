import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      // Nevažeći/opozvani kolačić se briše, pa middleware na sljedećoj stranici šalje na prijavu
      const res = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      res.cookies.set('bl_session', '', { expires: new Date(0), path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
      return res;
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true, points: true, totalPoints: true, avatarUrl: true },
    });
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json({ ...session, user: { ...session.user, emailVerified: !!user.emailVerified, points: user.points, totalPoints: user.totalPoints, avatarUrl: user.avatarUrl } });
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
