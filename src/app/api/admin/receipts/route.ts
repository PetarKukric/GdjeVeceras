import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

async function staff() {
  const session = await getSession();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) return null;
  return session.user;
}

/** Zahtjevi za bonus za račun (ADMIN: svi, OWNER: samo njegovi lokali) */
export async function GET(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const status = request.nextUrl.searchParams.get('status') || 'PENDING';
  const claims = await prisma.receiptClaim.findMany({
    where: {
      ...(['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? { status } : {}),
      ...(user.role === 'ADMIN' ? {} : { venue: { ownerId: user.id } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, amount: true, photoUrl: true, qrData: true, status: true, points: true, note: true, createdAt: true, reviewedAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      venue: { select: { name: true, receiptMinAmount: true, receiptBonusPoints: true } },
      checkIn: { select: { createdAt: true, method: true } },
    },
  });
  return NextResponse.json(claims);
}

/** Odobri / odbij: { id, approve: boolean, note? } — bodovi idu tek pri odobrenju, samo jednom */
export async function PATCH(request: NextRequest) {
  const user = await staff();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const claim = typeof body.id === 'string'
    ? await prisma.receiptClaim.findUnique({ where: { id: body.id }, include: { venue: { select: { ownerId: true, receiptBonusPoints: true } } } })
    : null;
  if (!claim) return NextResponse.json({ error: 'Zahtjev nije pronađen.' }, { status: 404 });
  if (user.role !== 'ADMIN' && claim.venue.ownerId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (claim.userId === user.id) return NextResponse.json({ error: 'Ne možeš odobriti svoj račun.' }, { status: 403 });

  const approve = body.approve === true;
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) || null : null;
  const points = approve ? claim.venue.receiptBonusPoints : 0;

  // Uslovno ažuriranje: samo PENDING zahtjev se može riješiti (nema dvostrukog dodjeljivanja bodova)
  const changed = await prisma.receiptClaim.updateMany({
    where: { id: claim.id, status: 'PENDING' },
    data: { status: approve ? 'APPROVED' : 'REJECTED', points, note, reviewedById: user.id, reviewedAt: new Date() },
  });
  if (changed.count !== 1) return NextResponse.json({ error: 'Zahtjev je već riješen.' }, { status: 409 });

  if (approve && points > 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: claim.userId }, data: { points: { increment: points }, totalPoints: { increment: points } } }),
      prisma.checkIn.update({ where: { id: claim.checkInId }, data: { points: { increment: points }, bonus: { increment: points } } }),
      prisma.notification.create({ data: { userId: claim.userId, type: 'RECEIPT_APPROVED', content: `Račun odobren: +${points} bodova` } }),
    ]);
  } else if (!approve) {
    await prisma.notification.create({ data: { userId: claim.userId, type: 'RECEIPT_REJECTED', content: `Račun nije odobren${note ? `: ${note}` : '.'}` } });
  }
  return NextResponse.json({ ok: true, status: approve ? 'APPROVED' : 'REJECTED', points });
}
