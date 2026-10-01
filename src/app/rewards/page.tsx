import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { RewardsClient, type RewardItem, type MyCode } from '@/components/score/RewardsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('rewards.metaTitle'), description: t('rewards.lead') };
}

export default async function RewardsPage() {
  const session = await getSession();
  const { t } = await getT();

  let rewards: RewardItem[] = [];
  let codes: MyCode[] = [];
  let balance: number | null = null;
  let failed = false;

  try {
    const [rewardRows, user, redemptions] = await Promise.all([
      prisma.reward.findMany({
        where: { active: true },
        orderBy: [{ venueId: 'asc' }, { cost: 'asc' }],
        select: {
          id: true, title: true, titleEn: true, description: true, descriptionEn: true,
          kind: true, cost: true, imageUrl: true, stock: true,
          venue: { select: { name: true, slug: true, city: true } },
        },
      }),
      session ? prisma.user.findUnique({ where: { id: session.user.id }, select: { points: true } }) : null,
      session ? prisma.redemption.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, code: true, status: true, createdAt: true, usedAt: true, reward: { select: { title: true, titleEn: true, venue: { select: { name: true } } } } },
      }) : [],
    ]);
    rewards = rewardRows;
    balance = user?.points ?? null;
    codes = JSON.parse(JSON.stringify(redemptions));
  } catch (error) {
    console.error('Rewards page error:', error);
    failed = true;
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{t('score.name')}</p>
            <h1 className="h1">{t('rewards.title')}</h1>
            <p className="lead">{t('rewards.lead')}</p>
          </div>
          {!session && <Link className="btn btn--pink" href="/signup?next=/rewards">{t('rewards.join')}</Link>}
        </div>
        {failed
          ? <div className="empty"><b>{t('common.errorTitle')}</b>{t('common.tryLater')}</div>
          : <RewardsClient rewards={rewards} codes={codes} initialBalance={balance} loggedIn={Boolean(session)} />}
      </div>
    </main>
  );
}
