import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { rateLimit } from '@/lib/rate-limit';
import { generateRedemptionCode } from '@/lib/score-service';

/** Zamjena bodova za nagradu. Vraća kod koji korisnik pokazuje osoblju. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const verificationError = await requireVerifiedEmail(session.user.id);
  if (verificationError) return NextResponse.json({ error: 'verify' }, { status: 403 });
  if (!rateLimit(`redeem:${session.user.id}`, 10, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  }

  const { rewardId } = await request.json().catch(() => ({}));
  const reward = typeof rewardId === 'string'
    ? await prisma.reward.findUnique({ where: { id: rewardId } })
    : null;
  if (!reward || !reward.active) return NextResponse.json({ error: 'notFound' }, { status: 404 });
  if (reward.stock !== null && reward.stock <= 0) return NextResponse.json({ error: 'soldOut' }, { status: 409 });

  // Atomično skidanje bodova — uspijeva samo ako korisnik ima dovoljno
  const charged = await prisma.user.updateMany({
    where: { id: session.user.id, points: { gte: reward.cost } },
    data: { points: { decrement: reward.cost } },
  });
  if (charged.count !== 1) return NextResponse.json({ error: 'insufficient' }, { status: 409 });

  const refund = () => prisma.user.update({ where: { id: session.user.id }, data: { points: { increment: reward.cost } } });

  if (reward.stock !== null) {
    const taken = await prisma.reward.updateMany({ where: { id: reward.id, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
    if (taken.count !== 1) {
      await refund();
      return NextResponse.json({ error: 'soldOut' }, { status: 409 });
    }
  }

  try {
    const redemption = await prisma.redemption.create({
      data: { userId: session.user.id, rewardId: reward.id, cost: reward.cost, code: generateRedemptionCode() },
      select: { id: true, code: true, createdAt: true },
    });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { points: true } });
    return NextResponse.json({ ...redemption, balance: user?.points ?? 0 }, { status: 201 });
  } catch (error) {
    console.error('Redeem error:', error);
    await refund();
    if (reward.stock !== null) await prisma.reward.update({ where: { id: reward.id }, data: { stock: { increment: 1 } } });
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
