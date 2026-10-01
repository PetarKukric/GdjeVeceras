import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { rateLimit } from '@/lib/rate-limit';
import { deleteUpload } from '@/lib/uploads';
import { saveUserImage } from '@/lib/user-upload';

/** Nova profilna slika (multipart: photo) */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  if (await requireVerifiedEmail(session.user.id)) return NextResponse.json({ error: 'verify' }, { status: 403 });
  if (!rateLimit(`avatar:${session.user.id}`, 10, 10 * 60_000).ok) {
    return NextResponse.json({ error: 'rateLimit' }, { status: 429 });
  }

  const saved = await saveUserImage((await request.formData()).get('photo'), 'avatars');
  if ('error' in saved) return NextResponse.json(saved, { status: 400 });

  const before = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: saved.url } });
  // Stara slika sa našeg skladišta se briše (Google slike su vanjski URL — njih ne diramo)
  if (before?.avatarUrl && !before.avatarUrl.includes('googleusercontent.com')) await deleteUpload(before.avatarUrl);
  return NextResponse.json({ avatarUrl: saved.url }, { status: 201 });
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const before = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  if (before?.avatarUrl && !before.avatarUrl.includes('googleusercontent.com')) await deleteUpload(before.avatarUrl);
  return NextResponse.json({ avatarUrl: null });
}
