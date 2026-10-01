import prisma from '@/lib/prisma';
import { currentStreakWeeks } from '@/lib/score-service';

/**
 * Podaci za profil (vlastiti i javni). Lokacija check-ina se nikad ne vraća — samo lokal, vrijeme i fotka.
 * Ako je korisnik sakrio check-ine (showCheckIns = false), drugi ih ne dobijaju uopšte (ne samo sakriveno u UI-ju).
 */
export async function loadProfile(userId: string, viewerId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, createdAt: true, points: true, totalPoints: true, restricted: true,
      avatarUrl: true, bio: true, showCheckIns: true,
      _count: { select: { checkIns: true, followers: true, following: true } },
    },
  });
  if (!user || user.restricted) return null;
  const isSelf = viewerId === userId;
  const checkInsVisible = isSelf || user.showCheckIns;

  const [venues, streak, checkIns, isFollowing, photos] = await Promise.all([
    prisma.checkIn.findMany({ where: { userId }, distinct: ['venueId'], select: { venueId: true } }),
    currentStreakWeeks(userId),
    checkInsVisible ? prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, points: true, method: true, photoUrl: true, createdAt: true, venue: { select: { name: true, slug: true } }, event: { select: { title: true } } },
    }) : Promise.resolve([]),
    viewerId && viewerId !== userId
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } }).then(Boolean)
      : Promise.resolve(false),
    prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { id: true, url: true, caption: true, createdAt: true, venue: { select: { name: true, slug: true } } },
    }),
  ]);

  return {
    user,
    photos,
    checkInsVisible,
    score: { points: user.points, totalPoints: user.totalPoints, checkIns: user._count.checkIns, venues: venues.length, streak },
    checkIns,
    isFollowing,
  };
}

/** Feed: nedavni check-ini ljudi koje pratim */
export async function loadFeed(viewerId: string) {
  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  if (!following.length) return [];
  return prisma.checkIn.findMany({
    where: {
      userId: { in: following.map((f) => f.followingId) },
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 3600_000) },
      user: { restricted: false, showCheckIns: true },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, points: true, photoUrl: true, createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      venue: { select: { name: true, slug: true } },
      event: { select: { title: true } },
    },
  });
}

/** Prijedlozi koga pratiti: najaktivniji ove sedmice koje još ne pratim */
export async function loadSuggestions(viewerId: string) {
  const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
  const exclude = [viewerId, ...following.map((f) => f.followingId)];
  return prisma.user.findMany({
    where: { id: { notIn: exclude }, restricted: false, totalPoints: { gt: 0 } },
    orderBy: { totalPoints: 'desc' },
    take: 5,
    select: { id: true, name: true, totalPoints: true, avatarUrl: true },
  });
}
