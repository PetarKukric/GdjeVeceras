import { put as blobPut, del as blobDel } from '@vercel/blob';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

/**
 * Čuvanje uploadovanih fajlova.
 * - Produkcija (BLOB_READ_WRITE_TOKEN podešen): Vercel Blob (trajno skladište)
 * - Razvoj (bez tokena): lokalni disk u public/uploads (kao do sada)
 * Vraća javni URL fajla.
 */
export async function saveUpload(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { url } = await blobPut(key, buffer, {
        access: 'public',
        contentType,
      });
      return url;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // Jasna poruka za Vercel Blob probleme
      if (/store does not exist/i.test(msg)) {
        throw new Error('BLOB store ne postoji — provjeri BLOB_READ_WRITE_TOKEN u Vercelu (Settings → Environment Variables).');
      }
      if (/private access/i.test(msg)) {
        throw new Error('BLOB store je privatan — u Vercelu (Storage → Blob → Settings) prebaci pristup na Public.');
      }
      throw new Error('Blob upload nije uspio: ' + msg.slice(0, 200));
    }
  }

  // Lokalni fallback (dev)
  const relativePath = `uploads/${key}`;
  const filePath = join(process.cwd(), 'public', relativePath);
  const dir = join(filePath, '..');
  try {
    await mkdir(dir, { recursive: true });
  } catch {}
  await writeFile(filePath, buffer);
  return `/${relativePath}`;
}

/**
 * Brisanje uploadovanog fajla (Blob ili lokalni disk).
 */
export async function deleteUpload(url: string): Promise<void> {
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await blobDel(url);
      return;
    }
    if (url.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', url);
      await unlink(filePath);
    }
  } catch {
    // Brisanje nije kritično — preskoči greške
  }
}
