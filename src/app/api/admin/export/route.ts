import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { sarajevoStartOfDay } from '@/lib/bosnia-time';

/**
 * CSV izvoz za marketing agente (.agents/marketing-team/data/).
 * GET /api/admin/export?type=checkins|signups|events&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Dani se računaju po sarajevskom vremenu. Bez imena i emailova — korisnik je samo anonimni user_ref.
 */

const TYPES = ['checkins', 'signups', 'events'] as const;
type ExportType = (typeof TYPES)[number];
const DAY_MS = 24 * 3600_000;
const MAX_DAYS = 366;

const sarajevoFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Sarajevo',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const dateTime = (d: Date) => {
  const [date, time] = sarajevoFmt.format(d).split(' ');
  return { date, time };
};
const userRef = (id: string) => createHash('sha256').update(`gv-export:${id}`).digest('hex').slice(0, 10);

/** "2026-10-03" → početak tog dana u Sarajevu (UTC trenutak). */
function dayStart(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return sarajevoStartOfDay(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)));
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  // BOM da Excel ispravno prikaže č, ć, đ, š, ž
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n';
}

async function checkinsCsv(from: Date, to: Date) {
  const checkIns = await prisma.checkIn.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
    select: {
      userId: true, method: true, points: true, bonus: true, createdAt: true,
      venue: { select: { name: true, slug: true, city: true, isPartner: true } },
      event: { select: { slug: true } },
      receiptClaim: { select: { status: true, points: true } },
    },
  });

  // Redni broj check-ina po korisniku (1 = prvi ikad) — za funnel prvi → drugi check-in
  const userIds = [...new Set(checkIns.map((c) => c.userId))];
  const before = userIds.length
    ? await prisma.checkIn.groupBy({ by: ['userId'], where: { userId: { in: userIds }, createdAt: { lt: from } }, _count: { _all: true } })
    : [];
  const seen = new Map(before.map((b) => [b.userId, b._count._all]));

  const rows = checkIns.map((c) => {
    const n = (seen.get(c.userId) ?? 0) + 1;
    seen.set(c.userId, n);
    const { date, time } = dateTime(c.createdAt);
    return [
      date, time, c.venue.city, c.venue.name, c.venue.slug, c.venue.isPartner ? 'yes' : 'no',
      c.method, c.points, c.bonus, c.event?.slug ?? '', userRef(c.userId), n,
      c.receiptClaim?.status ?? '', c.receiptClaim?.points ?? '',
    ];
  });
  return toCsv(
    ['date', 'time', 'city', 'venue', 'venue_slug', 'venue_partner_now', 'method', 'points', 'bonus', 'event_slug', 'user_ref', 'user_checkin_number', 'receipt_status', 'receipt_points'],
    rows,
  );
}

async function signupsCsv(from: Date, to: Date) {
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, createdAt: true, emailVerified: true, googleId: true, role: true, totalPoints: true,
      _count: { select: { checkIns: true } },
      checkIns: { orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true, venue: { select: { city: true } } } },
    },
  });
  const rows = users.map((u) => {
    const first = u.checkIns[0];
    const { date, time } = dateTime(u.createdAt);
    return [
      date, time, userRef(u.id), u.googleId ? 'google' : 'email', u.emailVerified ? 'yes' : 'no', u.role,
      u._count.checkIns, first ? dateTime(first.createdAt).date : '',
      first ? Math.floor((first.createdAt.getTime() - u.createdAt.getTime()) / DAY_MS) : '',
      first?.venue.city ?? '', u.totalPoints,
    ];
  });
  return toCsv(
    ['signup_date', 'signup_time', 'user_ref', 'method', 'email_verified', 'role', 'checkins_total', 'first_checkin_date', 'days_to_first_checkin', 'first_checkin_city', 'total_points'],
    rows,
  );
}

async function eventsCsv(from: Date, to: Date) {
  const events = await prisma.event.findMany({
    where: { startDateTime: { gte: from, lt: to } },
    orderBy: { startDateTime: 'asc' },
    select: {
      title: true, slug: true, category: true, status: true, startDateTime: true, price: true, currency: true,
      performers: true, isRecurring: true, imageUrl: true,
      venue: { select: { name: true, city: true, isPartner: true } },
      _count: { select: { favorites: true, checkIns: true } },
    },
  });
  const rows = events.map((e) => {
    const { date, time } = dateTime(e.startDateTime);
    return [
      date, time, e.venue.city, e.venue.name, e.venue.isPartner ? 'yes' : 'no', e.title, e.category, e.status,
      e.performers ?? '', e.price ?? '', e.price != null ? e.currency : '', e.isRecurring ? 'yes' : 'no',
      e.imageUrl ? 'yes' : 'no', e._count.favorites, e._count.checkIns, e.slug,
    ];
  });
  return toCsv(
    ['date', 'time', 'city', 'venue', 'venue_partner_now', 'title', 'category', 'status', 'performers', 'price', 'currency', 'recurring', 'has_image', 'saves', 'checkins', 'slug'],
    rows,
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const type = params.get('type') as ExportType | null;
  const fromStr = params.get('from') ?? '';
  const toStr = params.get('to') ?? '';
  const from = dayStart(fromStr);
  const toDay = dayStart(toStr);
  if (!type || !TYPES.includes(type)) return NextResponse.json({ error: 'Nepoznat tip izvoza.' }, { status: 400 });
  if (!from || !toDay) return NextResponse.json({ error: 'Datumi moraju biti u formatu GGGG-MM-DD.' }, { status: 400 });
  // Kraj = početak dana poslije "to" (uključuje cijeli zadnji dan)
  const to = dayStart(new Date(toDay.getTime() + 36 * 3600_000).toISOString().slice(0, 10))!;
  if (to <= from) return NextResponse.json({ error: '"Do" mora biti isti dan ili poslije "Od".' }, { status: 400 });
  if (to.getTime() - from.getTime() > MAX_DAYS * DAY_MS + 2 * 3600_000) {
    return NextResponse.json({ error: `Najduži period je ${MAX_DAYS} dana.` }, { status: 400 });
  }

  try {
    const csv = type === 'checkins' ? await checkinsCsv(from, to) : type === 'signups' ? await signupsCsv(from, to) : await eventsCsv(from, to);
    // Ime fajla = zadnji dan perioda, kako ga agenti očekuju (data/README.md)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-${toStr}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Admin export error:', error);
    return NextResponse.json({ error: 'Izvoz nije uspio.' }, { status: 500 });
  }
}
