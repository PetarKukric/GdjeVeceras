import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkInUrl } from '@/lib/score-service';

async function staff() {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) return null;
  return session.user;
}

/** Lokali sa check-in podešavanjima (ADMIN: svi, OWNER: samo svoji) */
export async function GET() {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const venues = await prisma.venue.findMany({
    where: user.role === 'ADMIN' ? {} : { ownerId: user.id },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, slug: true, city: true, latitude: true, longitude: true,
      isPartner: true, checkInPoints: true, checkInVersion: true,
      _count: { select: { checkIns: { where: { createdAt: { gte: since } } } } },
    },
  });

  return NextResponse.json(venues.map(({ _count, ...venue }) => ({
    ...venue,
    checkIns30d: _count.checkIns,
    checkInUrl: venue.isPartner ? checkInUrl(venue) : null,
  })));
}

/** Izmjena: partner status (samo ADMIN), bodovi po check-inu, nova verzija QR koda */
export async function PATCH(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const venue = typeof body.venueId === 'string'
    ? await prisma.venue.findUnique({ where: { id: body.venueId }, select: { id: true, ownerId: true } })
    : null;
  if (!venue) return NextResponse.json({ error: 'Lokal nije pronađen.' }, { status: 404 });
  if (user.role !== 'ADMIN' && venue.ownerId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const data: { isPartner?: boolean; checkInPoints?: number; checkInVersion?: { increment: number } } = {};
  if (typeof body.isPartner === 'boolean') {
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Samo admin mijenja partner status.' }, { status: 403 });
    data.isPartner = body.isPartner;
  }
  if (body.checkInPoints !== undefined) {
    const points = Math.round(Number(body.checkInPoints));
    if (!Number.isFinite(points) || points < 10 || points > 1000) {
      return NextResponse.json({ error: 'Bodovi moraju biti između 10 i 1000.' }, { status: 400 });
    }
    data.checkInPoints = points;
  }
  if (body.regenerate === true) data.checkInVersion = { increment: 1 };

  const updated = await prisma.venue.update({
    where: { id: venue.id },
    data,
    select: { id: true, slug: true, isPartner: true, checkInPoints: true, checkInVersion: true },
  });
  return NextResponse.json({ ...updated, checkInUrl: updated.isPartner ? checkInUrl(updated) : null });
}
