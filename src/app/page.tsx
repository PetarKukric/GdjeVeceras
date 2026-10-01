import type { Metadata } from 'next';
import { HomeClient, type HomeScore, type HomePartner, type HomeReward } from '@/components/home/HomeClient';
import { getInitialPublicEvents } from '@/lib/public-event-data';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import prisma from '@/lib/prisma';
import { currentStreakWeeks, getLeaderboard, type LeaderboardRow } from '@/lib/score-service';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
    alternates: { canonical: '/' },
  };
}

type HomeProps = {
  searchParams: Promise<{ city?: string; date?: string }>;
};

async function loadScore(userId: string): Promise<HomeScore | null> {
  const [user, venues, streak] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, totalPoints: true, _count: { select: { checkIns: true } } } }),
    prisma.checkIn.findMany({ where: { userId }, distinct: ['venueId'], select: { venueId: true } }),
    currentStreakWeeks(userId),
  ]);
  if (!user) return null;
  return { points: user.points, totalPoints: user.totalPoints, checkIns: user._count.checkIns, venues: venues.length, streak };
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const city = params.city || '';
  const date = ['today', 'tomorrow', 'weekend'].includes(params.date || '') ? params.date! : 'today';
  const session = await getSession();

  let initialEvents: unknown[] = [];
  let score: HomeScore | null = null;
  let partners: HomePartner[] = [];
  let rewards: HomeReward[] = [];
  let board: LeaderboardRow[] = [];

  const [eventsResult, scoreResult, partnersResult, rewardsResult, boardResult] = await Promise.allSettled([
    getInitialPublicEvents(city, date),
    session ? loadScore(session.user.id) : Promise.resolve(null),
    prisma.venue.findMany({
      // Partneri i lokali boostovani za vikend
      where: { OR: [{ isPartner: true }, { boostedUntil: { gt: new Date() } }] },
      orderBy: { checkIns: { _count: 'desc' } },
      take: 6,
      select: { id: true, name: true, slug: true, city: true, imageUrl: true, isPartner: true, boostedUntil: true, tags: { select: { name: true }, take: 2 } },
    }),
    prisma.reward.findMany({
      where: { active: true, type: 'REDEEM' },
      orderBy: { cost: 'asc' },
      take: 4,
      select: { id: true, title: true, titleEn: true, cost: true, kind: true, venue: { select: { name: true } } },
    }),
    getLeaderboard({ period: 'week', scope: 'city', viewerId: session?.user.id, take: 6 }),
  ]);

  if (eventsResult.status === 'fulfilled') initialEvents = eventsResult.value;
  else console.error('Home SSR events error:', eventsResult.reason);
  if (scoreResult.status === 'fulfilled') score = scoreResult.value;
  if (partnersResult.status === 'fulfilled') {
    partners = partnersResult.value.map(({ tags, boostedUntil, ...venue }) => ({ ...venue, boostedUntil: boostedUntil ? boostedUntil.toISOString() : null, tags: tags.map((tag) => tag.name) }));
  }
  if (rewardsResult.status === 'fulfilled') rewards = rewardsResult.value;
  if (boardResult.status === 'fulfilled') board = boardResult.value.rows;
  [scoreResult, partnersResult, rewardsResult, boardResult].forEach((result) => {
    if (result.status === 'rejected') console.error('Home score data error:', result.reason);
  });

  return (
    <HomeClient
      explicitCity={params.city !== undefined}
      initialCity={city}
      initialDate={date}
      initialEvents={JSON.parse(JSON.stringify(initialEvents))}
      loggedIn={Boolean(session)}
      score={score}
      partners={partners}
      rewards={rewards}
      board={board}
    />
  );
}
