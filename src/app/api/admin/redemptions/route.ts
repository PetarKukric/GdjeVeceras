import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Provjera i iskorištavanje koda nagrade na šanku.
 * POST { code, use?: boolean } — bez `use` samo provjerava, sa `use: true` označava kao iskorišteno.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return NextResponse.json({ error: 'Unesi kod.' }, { status: 400 });

  const redemption = await prisma.redemption.findUnique({
    where: { code },
    include: {
      user: { select: { name: true } },
      reward: { select: { title: true, venueId: true, venue: { select: { name: true, ownerId: true } } } },
    },
  });
  if (!redemption) return NextResponse.json({ error: 'Kod ne postoji.' }, { status: 404 });

  // Vlasnik vidi samo kodove za nagrade svog lokala; GV merch validira samo admin
  if (session.user.role !== 'ADMIN' && redemption.reward.venue?.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Ovaj kod ne pripada tvom lokalu.' }, { status: 403 });
  }

  if (body.use === true) {
    if (redemption.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Kod je već iskorišten ili otkazan.' }, { status: 409 });
    }
    const updated = await prisma.redemption.updateMany({
      where: { id: redemption.id, status: 'ACTIVE' },
      data: { status: 'USED', usedAt: new Date() },
    });
    if (updated.count !== 1) return NextResponse.json({ error: 'Kod je već iskorišten.' }, { status: 409 });
    return NextResponse.json({ ...redemption, status: 'USED', usedAt: new Date().toISOString() });
  }

  return NextResponse.json(redemption);
}
