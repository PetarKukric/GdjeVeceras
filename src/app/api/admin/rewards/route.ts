import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { monthKey } from '@/lib/score';
import { REWARD_PROVIDERS as PROVIDERS } from '@/lib/rewards';

const KINDS = ['DRINK', 'ENTRY', 'MERCH', 'OTHER'];
/** Ko izdaje nagradu kad nije vezana za lokal */


async function staff() {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) return null;
  return session.user;
}

function clean(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

/** ADMIN vidi sve nagrade; OWNER samo nagrade svojih lokala */
export async function GET() {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const rewards = await prisma.reward.findMany({
    where: user.role === 'ADMIN' ? {} : { venue: { ownerId: user.id } },
    orderBy: [{ type: 'asc' }, { month: 'desc' }, { topRank: 'asc' }, { active: 'desc' }, { cost: 'asc' }],
    include: {
      venue: { select: { id: true, name: true } },
      _count: { select: { redemptions: true } },
      awards: { select: { user: { select: { id: true, name: true } } } },
    },
  });
  return NextResponse.json(rewards);
}

export async function POST(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const title = clean(body.title, 80);
  const type = body.type === 'TOP' ? 'TOP' : 'REDEEM';
  const venueId = clean(body.venueId, 40);
  if (!title) return NextResponse.json({ error: 'Naziv je obavezan.' }, { status: 400 });

  let cost = 0, topRank: number | null = null, month: string | null = null;
  if (type === 'REDEEM') {
    cost = Math.round(Number(body.cost));
    if (!Number.isFinite(cost) || cost < 10 || cost > 100000) {
      return NextResponse.json({ error: 'Cijena mora biti između 10 i 100.000 bodova.' }, { status: 400 });
    }
  } else {
    // Mjesečne top-5 nagrade postavlja samo admin, za tekući ili budući mjesec
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Top 5 nagrade postavlja samo admin.' }, { status: 403 });
    topRank = Math.round(Number(body.topRank));
    month = typeof body.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month) ? body.month : null;
    if (!(topRank >= 1 && topRank <= 5)) return NextResponse.json({ error: 'Mjesto mora biti od 1 do 5.' }, { status: 400 });
    if (!month || month < monthKey()) return NextResponse.json({ error: 'Izaberi tekući ili budući mjesec.' }, { status: 400 });
    const taken = await prisma.reward.findFirst({ where: { type: 'TOP', month, topRank, active: true } });
    if (taken) return NextResponse.json({ error: `Za ${topRank}. mjesto u ${month} već postoji nagrada.` }, { status: 409 });
  }

  // Bez lokala = nagrada provajdera (GdjeVečeras merch ili Panther Tike) — samo admin
  const provider = venueId ? null : (PROVIDERS.includes(body.provider) ? body.provider : 'GV');
  if (!venueId && user.role !== 'ADMIN') return NextResponse.json({ error: 'Izaberi lokal.' }, { status: 400 });
  if (venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { ownerId: true } });
    if (!venue) return NextResponse.json({ error: 'Lokal nije pronađen.' }, { status: 404 });
    if (user.role !== 'ADMIN' && venue.ownerId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const stock = type === 'TOP' ? 1 : body.stock === '' || body.stock === null || body.stock === undefined ? null : Math.max(0, Math.round(Number(body.stock)));
  const reward = await prisma.reward.create({
    data: {
      title,
      titleEn: clean(body.titleEn, 80),
      description: clean(body.description, 300),
      descriptionEn: clean(body.descriptionEn, 300),
      kind: KINDS.includes(body.kind) ? body.kind : 'OTHER',
      cost,
      imageUrl: clean(body.imageUrl, 500),
      stock: Number.isFinite(stock as number) ? stock : null,
      venueId,
      provider,
      type,
      topRank,
      month,
    },
  });
  return NextResponse.json(reward, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const reward = typeof body.id === 'string'
    ? await prisma.reward.findUnique({ where: { id: body.id }, include: { venue: { select: { ownerId: true } } } })
    : null;
  if (!reward) return NextResponse.json({ error: 'Nagrada nije pronađena.' }, { status: 404 });
  if (user.role !== 'ADMIN' && reward.venue?.ownerId !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const data: {
    active?: boolean; cost?: number; stock?: number | null; title?: string; titleEn?: string | null;
    description?: string | null; descriptionEn?: string | null; kind?: string; imageUrl?: string | null; provider?: string;
  } = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (body.provider !== undefined && !reward.venueId && PROVIDERS.includes(body.provider)) data.provider = body.provider;
  if (body.cost !== undefined && reward.type === 'REDEEM') {
    const cost = Math.round(Number(body.cost));
    if (!Number.isFinite(cost) || cost < 10 || cost > 100000) return NextResponse.json({ error: 'Cijena mora biti između 10 i 100.000 bodova.' }, { status: 400 });
    data.cost = cost;
  }
  if (body.stock !== undefined) {
    data.stock = body.stock === null || body.stock === '' ? null : Math.max(0, Math.round(Number(body.stock)) || 0);
  }
  if (body.title !== undefined) {
    const title = clean(body.title, 80);
    if (!title) return NextResponse.json({ error: 'Naziv je obavezan.' }, { status: 400 });
    data.title = title;
  }
  if (body.titleEn !== undefined) data.titleEn = clean(body.titleEn, 80);
  if (body.description !== undefined) data.description = clean(body.description, 300);
  if (body.descriptionEn !== undefined) data.descriptionEn = clean(body.descriptionEn, 300);
  if (body.imageUrl !== undefined) data.imageUrl = clean(body.imageUrl, 500);
  if (body.kind !== undefined && KINDS.includes(body.kind)) data.kind = body.kind;

  const updated = await prisma.reward.update({ where: { id: reward.id }, data });
  return NextResponse.json(updated);
}

/** Brisanje: nagrada bez zamjena se briše, a ona koja ima izdate kodove se samo sakrije (kodovi ostaju važeći) */
export async function DELETE(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const id = request.nextUrl.searchParams.get('id') || '';
  const reward = await prisma.reward.findUnique({ where: { id }, include: { venue: { select: { ownerId: true } }, _count: { select: { redemptions: true } } } });
  if (!reward) return NextResponse.json({ error: 'Nagrada nije pronađena.' }, { status: 404 });
  if (user.role !== 'ADMIN' && reward.venue?.ownerId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (reward._count.redemptions > 0) {
    await prisma.reward.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ deleted: false, hidden: true });
  }
  await prisma.reward.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
