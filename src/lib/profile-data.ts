import prisma from '@/lib/prisma';
import { currentStreakWeeks } from '@/lib/score-service';

/** Skida fotku sa check-ina koje gledalac ne smije vidjeti */
function visiblePhotos<T extends { photoUrl: string | null; photoVisibility: string }>(items: T[], canSee: (item: T) => boolean): T[] {
  return items.map((c) => (c.photoVisibility === 'FRIENDS' && !canSee(c) ? { ...c, photoUrl: null } : c));
}

/** Prijatelji = oboje prate jedno drugo */
export async function friendIds(userId: string): Promise<Set<string>> {
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
  ]);
  const back = new Set(followers.map((f) => f.followerId));
  return new Set(following.map((f) => f.followingId).filter((id) => back.has(id)));
}

/**
 * Podaci za profil (vlastiti i javni). Lokacija check-ina se nikad ne vraća — samo lokal, vrijeme i fotka.
 * Ako je korisnik sakrio check-ine (showCheckIns = false), drugi ih ne dobijaju uopšte (ne samo sakriveno u UI-ju).
 * Fotke check-ina označene "samo prijatelji" (photoVisibility = FRIENDS) vide samo vlasnik i prijatelji (međusobno praćenje) —
 * ostali dobijaju photoUrl = null, pa URL fotke nikad ne stigne do njih.
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

  const other = viewerId && viewerId !== userId ? viewerId : null;
  const [venues, streak, checkIns, isFollowing, followsYou, photos] = await Promise.all([
    prisma.checkIn.findMany({ where: { userId }, distinct: ['venueId'], select: { venueId: true } }),
    currentStreakWeeks(userId),
    checkInsVisible ? prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, points: true, method: true, photoUrl: true, photoVisibility: true, createdAt: true, venue: { select: { name: true, slug: true } }, event: { select: { title: true } } },
    }) : Promise.resolve([]),
    other
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: other, followingId: userId } } }).then(Boolean)
      : Promise.resolve(false),
    other
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: other } } }).then(Boolean)
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
    checkIns: visiblePhotos(checkIns, () => isSelf || (isFollowing && followsYou)),
    isFollowing,
    followsYou,
    isFriend: isFollowing && followsYou,
  };
}

/** Feed: nedavni check-ini ljudi koje pratim */
export async function loadFeed(viewerId: string) {
  const [following, friends] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
    friendIds(viewerId),
  ]);
  if (!following.length) return [];
  const items = await prisma.checkIn.findMany({
    where: {
      userId: { in: following.map((f) => f.followingId) },
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 3600_000) },
      user: { restricted: false, showCheckIns: true },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, userId: true, points: true, photoUrl: true, photoVisibility: true, createdAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      venue: { select: { name: true, slug: true } },
      event: { select: { title: true } },
    },
  });
  return visiblePhotos(items, (c) => friends.has(c.userId));
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
