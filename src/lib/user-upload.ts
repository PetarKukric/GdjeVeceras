import crypto from 'crypto';
import { saveUpload } from '@/lib/uploads';
import { detectMedia, mediaMatchesDeclaredType } from '@/lib/media-validation';

export const MAX_USER_PHOTO_BYTES = 10 * 1024 * 1024;

/** Provjeri i sačuvaj korisničku sliku (magic bytes, ne samo MIME). Vraća URL ili kod greške. */
export async function saveUserImage(file: FormDataEntryValue | null, folder: string): Promise<{ url: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: 'noPhoto' };
  if (file.size > MAX_USER_PHOTO_BYTES) return { error: 'photoTooLarge' };
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMedia(buffer);
  if (!detected || detected.kind !== 'IMAGE' || !mediaMatchesDeclaredType(detected, file.type)) return { error: 'badPhoto' };
  const url = await saveUpload(`${folder}/${crypto.randomUUID()}.${detected.ext}`, buffer, detected.mime);
  return { url };
}
