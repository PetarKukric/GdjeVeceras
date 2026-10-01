import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { rateLimit } from '@/lib/rate-limit';
import { deleteUpload } from '@/lib/uploads';
import { saveUserImage } from '@/lib/user-upload';

const MAX_PHOTOS = 60;

/** Dodaj fotku iz izlaska na profil (multipart: photo, caption?, venueId?) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (await requireVerifiedEmail(session.user.id)) return NextResponse.json({ error: 'verify' }, { status: 403 });
  if (!rateLimit(`photos:${session.user.id}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  }
  if (await prisma.userPhoto.count({ where: { userId: session.user.id } }) >= MAX_PHOTOS) {
    return NextResponse.json({ error: 'tooMany' }, { status: 400 });
  }

  const form = await request.formData();
  const venueId = typeof form.get('venueId') === 'string' ? String(form.get('venueId')) : '';
  const venue = venueId ? await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } }) : null;
  const saved = await saveUserImage(form.get('photo'), 'user-photos');
  if ('error' in saved) return NextResponse.json(saved, { status: 400 });

  const photo = await prisma.userPhoto.create({
    data: {
      userId: session.user.id,
      url: saved.url,
      caption: String(form.get('caption') || '').trim().slice(0, 120) || null,
      venueId: venue?.id ?? null,
    },
    select: { id: true, url: true, caption: true, createdAt: true, venue: { select: { name: true, slug: true } } },
  });
  return NextResponse.json(photo, { status: 201 });
}

/** Obriši svoju fotku: DELETE /api/profile/photos?id=... */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id') || '';
  const photo = await prisma.userPhoto.findUnique({ where: { id } });
  if (!photo || (photo.userId !== session.user.id && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'notFound' }, { status: 404 });
  }
  await prisma.userPhoto.delete({ where: { id } });
  await deleteUpload(photo.url);
  return NextResponse.json({ ok: true });
}
