import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { requireVerifiedEmail } from '@/lib/verification';
import { saveUpload } from '@/lib/uploads';
import { detectMedia, mediaMatchesDeclaredType } from '@/lib/media-validation';
import crypto from 'crypto';

/**
 * Upload slike (naslovne slike događaja/lokala, itd.).
 * Dozvoljeni formati: slike (jpg, png, gif, webp), max 10MB.
 * U produkciji ide na Vercel Blob, lokalno na disk (public/uploads).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const verificationError = await requireVerifiedEmail(session.user.id);
    if (verificationError) return verificationError;

    // Admin ili vlasnik lokala
    if (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nema fajla za upload.' }, { status: 400 });
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Dozvoljene su samo slike (JPG, PNG, GIF, WebP).' }, { status: 400 });
    }

    // Validacija veličine
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Slika je prevelika (maks 10MB).' }, { status: 400 });
    }

    // Odbij sumnjive ekstenzije
    const name = (file.name || '').toLowerCase();
    if (/\.(exe|sh|bat|js|html|svg)$/.test(name)) {
      return NextResponse.json({ error: 'Ovaj format fajla nije dozvoljen.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Browserov MIME i ekstenzija se mogu lažirati; potvrdi magic bytes.
    const detected = detectMedia(buffer);
    if (!detected || detected.kind !== 'IMAGE' || !mediaMatchesDeclaredType(detected, file.type)) {
      return NextResponse.json({ error: 'Sadržaj fajla ne odgovara dozvoljenom formatu slike.' }, { status: 400 });
    }

    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    const url = await saveUpload(`covers/${filename}`, buffer, detected.mime);

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error && error.message ? error.message : 'Greška pri uploadu slike.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
