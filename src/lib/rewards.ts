import prisma from '@/lib/prisma';
import { generateRedemptionCode, monthRange } from '@/lib/score-service';
import { monthKey, previousMonthKey } from '@/lib/score';

export { REWARD_PROVIDERS, PROVIDER_LABEL, rewardIssuer } from '@/lib/reward-labels';

/** Top 5 korisnika po bodovima zarađenim u mjesecu (check-ini + odobreni računi su već u CheckIn.points) */
export async function monthlyTop(month: string, take = 5) {
  const [from, to] = monthRange(month);
  const grouped = await prisma.checkIn.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: from, lt: to }, user: { restricted: false } },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take,
  });
  const users = await prisma.user.findMany({ where: { id: { in: grouped.map((g) => g.userId) } }, select: { id: true, name: true, avatarUrl: true } });
  const map = new Map(users.map((u) => [u.id, u]));
  return grouped.map((g, i) => ({ rank: i + 1, userId: g.userId, points: g._sum.points || 0, name: map.get(g.userId)?.name || '', avatarUrl: map.get(g.userId)?.avatarUrl || null }));
}

/**
 * Dodjela mjesečnih top-5 nagrada za prošli mjesec (poziva se početkom mjeseca — Vercel Cron ili admin dugme).
 * Idempotentno: MonthlyAward ima unique (month, rank), pa ponovni poziv ne dodjeljuje ništa dvaput.
 * Pobjednik dobija kod (Redemption) kao da je nagradu "kupio" za 0 bodova + obavještenje.
 */
export async function awardMonth(month = previousMonthKey(monthKey())) {
  if (month >= monthKey()) return { month, awarded: [] as { rank: number; userId: string }[], skipped: 'monthNotOver' };
  const [prizes, top] = await Promise.all([
    prisma.reward.findMany({ where: { type: 'TOP', month, active: true }, orderBy: { topRank: 'asc' } }),
    monthlyTop(month),
  ]);
  const awarded: { rank: number; userId: string }[] = [];
  for (const prize of prizes) {
    const winner = top.find((t) => t.rank === prize.topRank);
    if (!winner || winner.points <= 0) continue;
    const exists = await prisma.monthlyAward.findUnique({ where: { month_rank: { month, rank: prize.topRank! } } });
    if (exists) continue;
    try {
      const redemption = await prisma.redemption.create({
        data: { userId: winner.userId, rewardId: prize.id, cost: 0, code: generateRedemptionCode() },
      });
      await prisma.$transaction([
        prisma.monthlyAward.create({ data: { month, rank: prize.topRank!, points: winner.points, rewardId: prize.id, userId: winner.userId, redemptionId: redemption.id } }),
        prisma.notification.create({ data: { userId: winner.userId, type: 'MONTHLY_AWARD', content: `Bio si #${prize.topRank} u ${month}! Nagrada „${prize.title}" čeka te u Moji kodovi.` } }),
      ]);
      awarded.push({ rank: prize.topRank!, userId: winner.userId });
    } catch (error) {
      // Istovremeni poziv je već dodijelio ovo mjesto (unique month+rank)
      console.warn('awardMonth skip', month, prize.topRank, error);
    }
  }
  return { month, awarded };
}
