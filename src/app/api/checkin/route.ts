import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { rateLimit } from '@/lib/rate-limit';
import { saveUpload } from '@/lib/uploads';
import { detectMedia, mediaMatchesDeclaredType } from '@/lib/media-validation';
import { CheckInError, assertCanCheckIn, performCheckIn, verifyCheckInCode } from '@/lib/score-service';

const venueSelect = {
  id: true, name: true, slug: true, latitude: true, longitude: true,
  isPartner: true, boostedUntil: true, checkInVersion: true,
  receiptBoostEnabled: true, receiptMinAmount: true, receiptBonusPoints: true,
} as const;

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Check-in u partner lokal.
 * - JSON { method: 'QR', venue: slug, code, lat?, lng?, accuracy? } — kod iz QR-a na ulazu
 * - multipart { method: 'PHOTO', venueId, lat, lng, accuracy, photo } — fotka + lokacija
 * Greške vraćaju { error: <kod> } koji klijent prevodi (checkin.errors.<kod>).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const verificationError = await requireVerifiedEmail(session.user.id);
  if (verificationError) return NextResponse.json({ error: 'verify' }, { status: 403 });

  const limited = rateLimit(`checkin:${session.user.id}`, 10, 10 * 60_000);
  if (!limited.ok) return NextResponse.json({ error: 'rateLimit' }, { status: 429 });

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const venueId = String(form.get('venueId') || '');
      const photo = form.get('photo');
      const lat = num(form.get('lat'));
      const lng = num(form.get('lng'));
      const accuracy = num(form.get('accuracy'));

      const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId }, select: venueSelect }) : null;
      if (!venue) return NextResponse.json({ error: 'notFound' }, { status: 404 });
      if (!(photo instanceof File) || photo.size === 0) return NextResponse.json({ error: 'noPhoto' }, { status: 400 });
      if (photo.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'photoTooLarge' }, { status: 400 });

      // Provjeri pravila PRIJE uploada da ne čuvamo fotke odbijenih check-ina
      await assertCanCheckIn({ userId: session.user.id, venue, method: 'PHOTO', lat, lng, accuracy });

      const buffer = Buffer.from(await photo.arrayBuffer());
      const detected = detectMedia(buffer);
      if (!detected || detected.kind !== 'IMAGE' || !mediaMatchesDeclaredType(detected, photo.type)) {
        return NextResponse.json({ error: 'badPhoto' }, { status: 400 });
      }
      const photoUrl = await saveUpload(`checkins/${crypto.randomUUID()}.${detected.ext}`, buffer, detected.mime);

      const result = await performCheckIn({ userId: session.user.id, venue, method: 'PHOTO', lat, lng, accuracy, photoUrl });
      return NextResponse.json(result, { status: 201 });
    }

    const body = await request.json().catch(() => ({}));
    const slug = typeof body.venue === 'string' ? body.venue : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const venue = slug ? await prisma.venue.findUnique({ where: { slug }, select: venueSelect }) : null;
    if (!venue) return NextResponse.json({ error: 'notFound' }, { status: 404 });
    if (!verifyCheckInCode(venue.id, venue.checkInVersion, code)) {
      return NextResponse.json({ error: 'invalidCode' }, { status: 400 });
    }

    const result = await performCheckIn({
      userId: session.user.id,
      venue,
      method: 'QR',
      lat: num(body.lat),
      lng: num(body.lng),
      accuracy: num(body.accuracy),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CheckInError) {
      const status = error.code === 'cooldown' ? 429 : 400;
      return NextResponse.json({ error: error.code, ...error.extra }, { status });
    }
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
