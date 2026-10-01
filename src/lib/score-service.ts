import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getSarajevoOffsetMs } from '@/lib/bosnia-time';
import { getCityBySlug } from '@/lib/cities';
import { CHECKIN_RULES, countWeekendStreak, distanceMeters, isBoosted, latestWeekendKey, monthKey, streakMultiplier, tierInfo, weekStart, weekendKey } from '@/lib/score';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function checkInSecret(): string {
  const secret = process.env.CHECKIN_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') throw new Error('CHECKIN_SECRET/JWT_SECRET nije postavljen u produkciji.');
  return 'dev-checkin-secret';
}

/** Kod koji je štampan u QR-u lokala. Izvodi se iz ID-a i verzije — nova verzija poništava stare QR kodove. */
export function checkInCodeFor(venueId: string, version: number): string {
  return crypto.createHmac('sha256', checkInSecret()).update(`${venueId}:${version}`).digest('base64url').slice(0, 22);
}

export function verifyCheckInCode(venueId: string, version: number, code: string): boolean {
  const expected = Buffer.from(checkInCodeFor(venueId, version));
  const given = Buffer.from(code || '');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function checkInUrl(venue: { id: string; slug: string; checkInVersion: number }): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com').replace(/\/$/, '');
  return `${base}/checkin?v=${encodeURIComponent(venue.slug)}&k=${checkInCodeFor(venue.id, venue.checkInVersion)}`;
}

/** Ključevi vikenda (pet/sub/ned) u kojima je korisnik imao check-in, zadnjih ~2 godine */
async function weekendKeys(userId: string): Promise<Set<number>> {
  const since = new Date(Date.now() - 104 * WEEK_MS);
  const rows = await prisma.checkIn.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } });
  const keys = new Set<number>();
  rows.forEach((r) => { const k = weekendKey(r.createdAt); if (k !== null) keys.add(k); });
  return keys;
}

/** Trenutni niz vikenda zaredom (tekući vikend se računa ako već ima izlazak) — za profil i prikaz */
export async function currentStreakWeeks(userId: string): Promise<number> {
  const keys = await weekendKeys(userId);
  const latest = latestWeekendKey();
  // Ako tekući vikend još nema izlazak, niz i dalje "živi" od prošlog vikenda
  return keys.has(latest) ? countWeekendStreak(keys, latest) : countWeekendStreak(keys, latest - 7);
}

export type CheckInErrorCode =
  | 'invalidCode' | 'tooFar' | 'noLocation' | 'noVenueLocation' | 'cooldown';

export class CheckInError extends Error {
  constructor(public code: CheckInErrorCode, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

interface CheckInVenue {
  id: string; name: string; slug: string; latitude: number | null; longitude: number | null;
  isPartner: boolean; boostedUntil: Date | null; receiptBoostEnabled: boolean; receiptMinAmount: number; receiptBonusPoints: number;
}

interface CheckInInput {
  userId: string;
  venue: CheckInVenue;
  method: 'QR' | 'PHOTO';
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  photoUrl?: string | null;
}

/** Provjere prije upisa (poziva se i prije uploada fotke, da ne čuvamo fotke za odbijene check-ine) */
export async function assertCanCheckIn(input: Omit<CheckInInput, 'photoUrl'>): Promise<number | null> {
  const { userId, venue, method, lat, lng, accuracy } = input;

  const hasUserLocation = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);
  const hasVenueLocation = typeof venue.latitude === 'number' && typeof venue.longitude === 'number';
  let distance: number | null = null;
  if (hasUserLocation && hasVenueLocation) distance = distanceMeters(lat!, lng!, venue.latitude!, venue.longitude!);

  if (method === 'PHOTO') {
    if (!hasVenueLocation) throw new CheckInError('noVenueLocation');
    if (!hasUserLocation || distance === null) throw new CheckInError('noLocation');
    const tolerance = Math.min(Math.max(accuracy || 0, 0), CHECKIN_RULES.maxAccuracyToleranceM);
    if (distance > CHECKIN_RULES.photoRadiusM + tolerance) throw new CheckInError('tooFar', { distance });
  } else if (distance !== null && distance > CHECKIN_RULES.qrMaxDistanceM) {
    throw new CheckInError('tooFar', { distance });
  }

  // Jedan check-in u 12h — bilo koji lokal
  const recent = await prisma.checkIn.findFirst({
    where: { userId, createdAt: { gte: new Date(Date.now() - CHECKIN_RULES.cooldownHours * 3600_000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (recent) {
    throw new CheckInError('cooldown', { nextAt: new Date(recent.createdAt.getTime() + CHECKIN_RULES.cooldownHours * 3600_000).toISOString() });
  }

  return distance;
}

export type BonusType = 'partner' | 'boost' | 'streak';

export async function performCheckIn(input: CheckInInput) {
  const { userId, venue, method, lat, lng, photoUrl } = input;
  const distance = await assertCanCheckIn(input);
  const now = new Date();

  const [user, liveEvent, keys] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }),
    prisma.event.findFirst({
      where: { venueId: venue.id, status: 'PUBLISHED', startDateTime: { lte: now }, endDateTime: { gte: now } },
      select: { id: true, title: true },
    }),
    weekendKeys(userId),
  ]);

  // Niz uključuje ovaj izlazak ako je danas vikend
  const thisWeekend = weekendKey(now);
  if (thisWeekend !== null) keys.add(thisWeekend);
  const latest = latestWeekendKey(now);
  const streak = keys.has(latest) ? countWeekendStreak(keys, latest) : countWeekendStreak(keys, latest - 7);
  const multiplier = streakMultiplier(streak);

  const r = CHECKIN_RULES;
  const bonuses: { type: BonusType; amount: number }[] = [];
  if (venue.isPartner) bonuses.push({ type: 'partner', amount: r.partnerBonus });
  if (isBoosted(venue, now.getTime())) bonuses.push({ type: 'boost', amount: r.boostBonus });
  const subtotal = r.basePoints + bonuses.reduce((s, b) => s + b.amount, 0);
  const points = Math.round(subtotal * multiplier);
  if (multiplier > 1) bonuses.push({ type: 'streak', amount: points - subtotal });
  const totalBefore = user?.totalPoints || 0;

  const [checkIn, updated] = await prisma.$transaction([
    prisma.checkIn.create({
      data: {
        userId, venueId: venue.id, eventId: liveEvent?.id, method, points, bonus: points - r.basePoints,
        photoUrl: photoUrl || null,
        latitude: typeof lat === 'number' ? lat : null,
        longitude: typeof lng === 'number' ? lng : null,
        distanceM: distance,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { points: { increment: points }, totalPoints: { increment: points } },
      select: { points: true, totalPoints: true },
    }),
  ]);

  // Zaštita od dvostrukog check-ina (dva istovremena zahtjeva prođu provjeru prije upisa)
  const window = new Date(now.getTime() - r.cooldownHours * 3600_000);
  const first = await prisma.checkIn.findFirst({
    where: { userId, createdAt: { gte: window } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
  });
  if (first && first.id !== checkIn.id) {
    await prisma.$transaction([
      prisma.checkIn.delete({ where: { id: checkIn.id } }),
      prisma.user.update({ where: { id: userId }, data: { points: { decrement: points }, totalPoints: { decrement: points } } }),
    ]);
    throw new CheckInError('cooldown', { nextAt: new Date(first.createdAt.getTime() + r.cooldownHours * 3600_000).toISOString() });
  }

  return {
    id: checkIn.id,
    points,
    base: r.basePoints,
    bonuses,
    streak,
    multiplier,
    balance: updated.points,
    total: updated.totalPoints,
    tierBefore: tierInfo(totalBefore).index,
    tierAfter: tierInfo(updated.totalPoints).index,
    venue: { name: venue.name, slug: venue.slug },
    event: liveEvent,
    receipt: venue.receiptBoostEnabled ? { minAmount: venue.receiptMinAmount, bonus: venue.receiptBonusPoints } : null,
  };
}

export type LeaderboardPeriod = 'week' | 'month' | 'all';
export type LeaderboardScope = 'city' | 'friends';

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  points: number;
  checkIns: number;
  totalPoints: number;
  lastVenue: string | null;
  avatarUrl: string | null;
  isMe: boolean;
}

export async function getLeaderboard(opts: { period: LeaderboardPeriod; scope: LeaderboardScope; viewerId?: string | null; city?: string; take?: number }) {
  const { period, scope, viewerId, take = 50 } = opts;
  const where: Prisma.CheckInWhereInput = { user: { restricted: false } };
  if (period === 'week') where.createdAt = { gte: weekStart() };
  if (period === 'month') { const [from, to] = monthRange(monthKey()); where.createdAt = { gte: from, lt: to }; }
  const city = getCityBySlug(opts.city);
  if (city) where.venue = { city: city.name };
  if (scope === 'friends') {
    if (!viewerId) return { rows: [] as LeaderboardRow[], me: null as LeaderboardRow | null };
    const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
    where.userId = { in: [viewerId, ...following.map((f) => f.followingId)] };
  }

  const grouped = await prisma.checkIn.groupBy({
    by: ['userId'],
    where,
    _sum: { points: true },
    _count: { _all: true },
    orderBy: { _sum: { points: 'desc' } },
    take,
  });

  const ids = grouped.map((g) => g.userId);
  const [users, lastCheckIns] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, totalPoints: true, avatarUrl: true, showCheckIns: true } }),
    prisma.checkIn.findMany({
      where: { ...where, userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(ids.length * 5, 500),
      select: { userId: true, venue: { select: { name: true } } },
    }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const lastVenue = new Map<string, string>();
  lastCheckIns.forEach((c) => { if (!lastVenue.has(c.userId)) lastVenue.set(c.userId, c.venue.name); });

  const rows: LeaderboardRow[] = grouped.map((g, i) => ({
    rank: i + 1,
    userId: g.userId,
    name: userMap.get(g.userId)?.name || 'Noćna ptica',
    points: g._sum.points || 0,
    checkIns: g._count._all,
    totalPoints: userMap.get(g.userId)?.totalPoints || 0,
    // Privatnost: "zadnje: lokal" se ne prikazuje za korisnike koji su sakrili check-ine
    lastVenue: userMap.get(g.userId)?.showCheckIns === false && g.userId !== viewerId ? null : lastVenue.get(g.userId) || null,
    avatarUrl: userMap.get(g.userId)?.avatarUrl || null,
    isMe: g.userId === viewerId,
  }));

  let me: LeaderboardRow | null = rows.find((r) => r.isMe) || null;
  if (!me && viewerId) {
    const mine = await prisma.checkIn.aggregate({ where: { ...where, userId: viewerId }, _sum: { points: true }, _count: { _all: true } });
    const myPoints = mine._sum.points || 0;
    const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { name: true, totalPoints: true, avatarUrl: true } });
    if (viewer) {
      const ahead = myPoints > 0
        ? await prisma.checkIn.groupBy({ by: ['userId'], where, having: { points: { _sum: { gt: myPoints } } } })
        : null;
      me = {
        rank: ahead ? ahead.length + 1 : 0,
        userId: viewerId,
        name: viewer.name || '',
        points: myPoints,
        checkIns: mine._count._all,
        totalPoints: viewer.totalPoints,
        lastVenue: null,
        avatarUrl: viewer.avatarUrl,
        isMe: true,
      };
    }
  }

  return { rows, me };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRedemptionCode(): string {
  const bytes = crypto.randomBytes(8);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `GV-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Početak i kraj mjeseca "YYYY-MM" po sarajevskom vremenu, kao UTC trenuci */
export function monthRange(key: string): [Date, Date] {
  const [y, m] = key.split('-').map(Number);
  const at = (yy: number, mm: number) => {
    const guess = new Date(Date.UTC(yy, mm - 1, 1));
    return new Date(guess.getTime() - getSarajevoOffsetMs(guess));
  };
  return [at(y, m), m === 12 ? at(y + 1, 1) : at(y, m + 1)];
}
