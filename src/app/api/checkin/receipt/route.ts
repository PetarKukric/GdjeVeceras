import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { rateLimit } from '@/lib/rate-limit';
import { saveUserImage } from '@/lib/user-upload';
import { CHECKIN_RULES } from '@/lib/score';

/**
 * Bonus za potrošnju: nakon check-ina gost slika račun (i ako može, skenira QR kod fiskalnog računa).
 * Bodovi se NE dodjeljuju odmah — zahtjev čeka da ga vlasnik lokala ili admin odobri u panelu.
 * Isti fiskalni QR (hash) ne može se prijaviti dvaput, a jedan check-in = najviše jedan račun.
 *
 * multipart: checkInId, amount, photo, qrData?
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (await requireVerifiedEmail(session.user.id)) return NextResponse.json({ error: 'verify' }, { status: 403 });
  if (!rateLimit(`receipt:${session.user.id}`, 5, 60 * 60_000).ok) return NextResponse.json({ error: 'rateLimit' }, { status: 429 });

  const form = await request.formData();
  const checkInId = String(form.get('checkInId') || '');
  const amount = Math.round(Number(form.get('amount')) * 100) / 100;
  const qrData = String(form.get('qrData') || '').trim().slice(0, 2000) || null;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: checkInId },
    select: {
      id: true, userId: true, venueId: true, createdAt: true, receiptClaim: { select: { id: true } },
      venue: { select: { receiptBoostEnabled: true, receiptMinAmount: true } },
    },
  });
  if (!checkIn || checkIn.userId !== session.user.id) return NextResponse.json({ error: 'notFound' }, { status: 404 });
  if (!checkIn.venue.receiptBoostEnabled) return NextResponse.json({ error: 'receiptOff' }, { status: 400 });
  if (checkIn.receiptClaim) return NextResponse.json({ error: 'receiptDone' }, { status: 409 });
  if (Date.now() - checkIn.createdAt.getTime() > CHECKIN_RULES.receiptWindowHours * 3600_000) {
    return NextResponse.json({ error: 'receiptLate' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < checkIn.venue.receiptMinAmount || amount > 100000) {
    return NextResponse.json({ error: 'receiptLow', min: checkIn.venue.receiptMinAmount }, { status: 400 });
  }

  const qrHash = qrData ? crypto.createHash('sha256').update(qrData).digest('hex') : null;
  if (qrHash && await prisma.receiptClaim.findUnique({ where: { qrHash } })) {
    return NextResponse.json({ error: 'receiptUsed' }, { status: 409 });
  }

  const saved = await saveUserImage(form.get('photo'), 'receipts');
  if ('error' in saved) return NextResponse.json(saved, { status: 400 });

  try {
    const claim = await prisma.receiptClaim.create({
      data: { userId: session.user.id, venueId: checkIn.venueId, checkInId: checkIn.id, amount, photoUrl: saved.url, qrData, qrHash },
      select: { id: true, status: true },
    });
    return NextResponse.json(claim, { status: 201 });
  } catch {
    // Jedinstveni ključevi (isti račun / isti check-in) — istovremeni zahtjevi
    return NextResponse.json({ error: 'receiptUsed' }, { status: 409 });
  }
}
