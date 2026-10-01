import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkInUrl } from '@/lib/score-service';
import { venuePoints } from '@/lib/score';

async function staff() {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) return null;
  return session.user;
}

const venueSelect = {
  id: true, name: true, slug: true, city: true, latitude: true, longitude: true,
  isPartner: true, boostedUntil: true, checkInVersion: true,
  receiptBoostEnabled: true, receiptMinAmount: true, receiptBonusPoints: true,
} as const;

/** Lokali sa check-in podešavanjima (ADMIN: svi, OWNER: samo svoji). Svaki lokal ima QR — svaki daje bodove. */
export async function GET() {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const venues = await prisma.venue.findMany({
    where: user.role === 'ADMIN' ? {} : { ownerId: user.id },
    orderBy: { name: 'asc' },
    select: { ...venueSelect, _count: { select: { checkIns: { where: { createdAt: { gte: since } } } } } },
  });

  return NextResponse.json(venues.map(({ _count, ...venue }) => ({
    ...venue,
    points: venuePoints(venue),
    checkIns30d: _count.checkIns,
    checkInUrl: checkInUrl(venue),
  })));
}

/** Kraj tekućeg/sljedećeg vikenda: nedjelja 23:59 lokalno (približno, UTC+1/+2) */
function endOfWeekend(): Date {
  const now = new Date();
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 ned
  const add = day === 0 ? 0 : 7 - day;
  d.setUTCDate(d.getUTCDate() + add);
  d.setUTCHours(23, 59, 0, 0);
  // + 6h da pokrije noć nedjelja→ponedjeljak
  return new Date(d.getTime() + 6 * 3600_000);
}

/**
 * Izmjena: partner status i vikend boost (samo ADMIN), bonus za račun (ADMIN; vlasnik samo iznos ako je uključeno),
 * nova verzija QR koda (admin i vlasnik).
 */
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
  const isAdmin = user.role === 'ADMIN';

  const data: {
    isPartner?: boolean; boostedUntil?: Date | null; checkInVersion?: { increment: number };
    receiptBoostEnabled?: boolean; receiptMinAmount?: number; receiptBonusPoints?: number;
  } = {};
  if (typeof body.isPartner === 'boolean') {
    if (!isAdmin) return NextResponse.json({ error: 'Samo admin mijenja partner status.' }, { status: 403 });
    data.isPartner = body.isPartner;
  }
  if (body.boost !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: 'Samo admin boostuje lokale.' }, { status: 403 });
    if (body.boost === 'weekend') data.boostedUntil = endOfWeekend();
    else if (body.boost === null || body.boost === false) data.boostedUntil = null;
    else {
      const until = new Date(body.boost);
      if (Number.isNaN(until.getTime()) || until.getTime() < Date.now()) return NextResponse.json({ error: 'Neispravan datum boosta.' }, { status: 400 });
      data.boostedUntil = until;
    }
  }
  if (typeof body.receiptBoostEnabled === 'boolean') {
    if (!isAdmin) return NextResponse.json({ error: 'Samo admin uključuje bonus za račun.' }, { status: 403 });
    data.receiptBoostEnabled = body.receiptBoostEnabled;
  }
  if (body.receiptMinAmount !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: 'Samo admin mijenja iznos.' }, { status: 403 });
    const amount = Number(body.receiptMinAmount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000) return NextResponse.json({ error: 'Iznos mora biti između 1 i 100.000.' }, { status: 400 });
    data.receiptMinAmount = Math.round(amount * 100) / 100;
  }
  if (body.receiptBonusPoints !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: 'Samo admin mijenja bonus.' }, { status: 403 });
    const pts = Math.round(Number(body.receiptBonusPoints));
    if (!Number.isFinite(pts) || pts < 1 || pts > 1000) return NextResponse.json({ error: 'Bonus mora biti između 1 i 1000.' }, { status: 400 });
    data.receiptBonusPoints = pts;
  }
  if (body.regenerate === true) data.checkInVersion = { increment: 1 };

  const updated = await prisma.venue.update({ where: { id: venue.id }, data, select: venueSelect });
  return NextResponse.json({ ...updated, points: venuePoints(updated), checkInUrl: checkInUrl(updated) });
}
