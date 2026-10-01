import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/** Podaci za stranicu Podešavanja (samo vlastiti nalog) */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true, avatarUrl: true, bio: true, showCheckIns: true, emailVerified: true, googleId: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const { googleId, emailVerified, ...rest } = user;
  return NextResponse.json({ ...rest, emailVerified: Boolean(emailVerified), hasGoogle: Boolean(googleId) });
}

/** Izmjena profila: { name?, bio?, showCheckIns? } */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (!rateLimit(`profile:${session.user.id}`, 30, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const data: { name?: string; bio?: string | null; showCheckIns?: boolean } = {};
  if (typeof body.name === 'string') {
    const name = body.name.trim().slice(0, 60);
    if (name.length < 2) return NextResponse.json({ error: 'nameShort' }, { status: 400 });
    data.name = name;
  }
  if (typeof body.bio === 'string') data.bio = body.bio.trim().slice(0, 160) || null;
  if (typeof body.showCheckIns === 'boolean') data.showCheckIns = body.showCheckIns;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { name: true, bio: true, showCheckIns: true },
  });
  return NextResponse.json(user);
}
