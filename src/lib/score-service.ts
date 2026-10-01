import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getCityBySlug } from '@/lib/cities';
import { CHECKIN_RULES, distanceMeters, tierInfo, weekStart } from '@/lib/score';

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

/** Broj uzastopnih sedmica sa check-inom PRIJE tekuće sedmice */
async function priorStreakWeeks(userId: string): Promise<number> {
  const since = new Date(weekStart().getTime() - 16 * WEEK_MS);
  const rows = await prisma.checkIn.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } });
  const weeks = new Set(rows.map((r) => weekStart(r.createdAt).getTime()));
  let streak = 0;
  for (let w = weekStart().getTime() - WEEK_MS; weeks.has(w); w -= WEEK_MS) streak++;
  return streak;
}

/** Trenutni niz (uključuje tekuću sedmicu ako već ima check-in) — za prikaz na profilu */
export async function currentStreakWeeks(userId: string): Promise<number> {
  const prior = await priorStreakWeeks(userId);
  const thisWeek = await prisma.checkIn.count({ where: { userId, createdAt: { gte: weekStart() } } });
  return thisWeek > 0 ? prior + 1 : prior;
}

export type CheckInErrorCode =
  | 'notPartner' | 'invalidCode' | 'tooFar' | 'noLocation' | 'noVenueLocation'
  | 'cooldown' | 'dailyLimit';

export class CheckInError extends Error {
  constructor(public code: CheckInErrorCode, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

interface CheckInInput {
  userId: string;
  venue: { id: string; name: string; slug: string; latitude: number | null; longitude: number | null; checkInPoints: number; isPartner: boolean };
  method: 'QR' | 'PHOTO';
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  photoUrl?: string | null;
}

/** Provjere prije upisa (poziva se i prije uploada fotke, da ne čuvamo fotke za odbijene check-ine) */
export async function assertCanCheckIn(input: Omit<CheckInInput, 'photoUrl'>): Promise<number | null> {
  const { userId, venue, method, lat, lng, accuracy } = input;
  if (!venue.isPartner) throw new CheckInError('notPartner');

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

  const now = Date.now();
  const recentSameVenue = await prisma.checkIn.findFirst({
    where: { userId, venueId: venue.id, createdAt: { gte: new Date(now - CHECKIN_RULES.cooldownHours * 3600_000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (recentSameVenue) {
    throw new CheckInError('cooldown', { nextAt: new Date(recentSameVenue.createdAt.getTime() + CHECKIN_RULES.cooldownHours * 3600_000).toISOString() });
  }

  const today = await prisma.checkIn.count({ where: { userId, createdAt: { gte: new Date(now - 24 * 3600_000) } } });
  if (today >= CHECKIN_RULES.dailyLimit) throw new CheckInError('dailyLimit');

  return distance;
}

export async function performCheckIn(input: CheckInInput) {
  const { userId, venue, method, lat, lng, photoUrl } = input;
  const distance = await assertCanCheckIn(input);
  const now = new Date();

  const [user, liveEvent, following, prior] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } }),
    prisma.event.findFirst({
      where: { venueId: venue.id, status: 'PUBLISHED', startDateTime: { lte: now }, endDateTime: { gte: now } },
      select: { id: true, title: true },
    }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    priorStreakWeeks(userId),
  ]);

  const bonuses: { type: 'live' | 'squad' | 'streak'; amount: number }[] = [];
  const base = Math.max(0, venue.checkInPoints);
  if (prior + 1 >= CHECKIN_RULES.streakWeeks) {
    bonuses.push({ type: 'streak', amount: Math.round(base * (CHECKIN_RULES.streakMultiplier - 1)) });
  }
  if (liveEvent) bonuses.push({ type: 'live', amount: CHECKIN_RULES.liveBonus });
  if (following.length) {
    const squad = await prisma.checkIn.findFirst({
      where: {
        venueId: venue.id,
        userId: { in: following.map((f) => f.followingId) },
        createdAt: { gte: new Date(now.getTime() - CHECKIN_RULES.squadWindowHours * 3600_000) },
      },
      select: { id: true },
    });
    if (squad) bonuses.push({ type: 'squad', amount: CHECKIN_RULES.squadBonus });
  }

  const bonus = bonuses.reduce((sum, b) => sum + b.amount, 0);
  const points = base + bonus;
  const totalBefore = user?.totalPoints || 0;

  const [checkIn, updated] = await prisma.$transaction([
    prisma.checkIn.create({
      data: {
        userId, venueId: venue.id, eventId: liveEvent?.id, method, points, bonus,
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

  // Zaštita od dvostrukog check-ina (dva istovremena zahtjeva prođu provjeru prije upisa):
  // ako u cooldown prozoru postoji raniji check-in za isti lokal, ovaj se poništava.
  const window = new Date(now.getTime() - CHECKIN_RULES.cooldownHours * 3600_000);
  const first = await prisma.checkIn.findFirst({
    where: { userId, venueId: venue.id, createdAt: { gte: window } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, createdAt: true },
  });
  if (first && first.id !== checkIn.id) {
    await prisma.$transaction([
      prisma.checkIn.delete({ where: { id: checkIn.id } }),
      prisma.user.update({ where: { id: userId }, data: { points: { decrement: points }, totalPoints: { decrement: points } } }),
    ]);
    throw new CheckInError('cooldown', { nextAt: new Date(first.createdAt.getTime() + CHECKIN_RULES.cooldownHours * 3600_000).toISOString() });
  }

  return {
    id: checkIn.id,
    points,
    base,
    bonuses,
    balance: updated.points,
    total: updated.totalPoints,
    tierBefore: tierInfo(totalBefore).index,
    tierAfter: tierInfo(updated.totalPoints).index,
    venue: { name: venue.name, slug: venue.slug },
    event: liveEvent,
  };
}

export type LeaderboardPeriod = 'week' | 'all';
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
