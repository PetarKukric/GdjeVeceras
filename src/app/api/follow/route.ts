import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/** Prati / prestani pratiti korisnika (toggle). Praćenje puni rang listu "Ekipa" i feed na profilu. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (!rateLimit(`follow:${session.user.id}`, 60, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  }

  const { userId } = await request.json().catch(() => ({}));
  if (typeof userId !== 'string' || userId === session.user.id) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, restricted: true } });
  if (!target || target.restricted) return NextResponse.json({ error: 'notFound' }, { status: 404 });

  const key = { followerId_followingId: { followerId: session.user.id, followingId: userId } };
  const existing = await prisma.follow.findUnique({ where: key });
  if (existing) {
    await prisma.follow.delete({ where: key });
  } else {
    await prisma.follow.create({ data: { followerId: session.user.id, followingId: userId } });
  }
  const followers = await prisma.follow.count({ where: { followingId: userId } });
  return NextResponse.json({ following: !existing, followers });
}

