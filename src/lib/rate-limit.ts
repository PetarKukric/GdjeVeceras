import { NextRequest } from 'next/server';

/**
 * Jednostavan in-memory rate limiter (zaštita od spama i brute-force).
 * Napomena: na serverless-u (Vercel) svaka instanca pamti svoje brojače —
 * nije savršeno, ali zaustavlja osnovne poplave zahtjeva. Svako okidanje
 * se loguje (console.warn) pa se vidi u Vercel logovima kao znak napada.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** IP adresa klijenta (Vercel prosljeđuje kroz x-forwarded-for) */
export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'nepoznata-ip';
}

/**
 * Provjerava ograničenje. Vraća { ok: false, retryAfter } kad je prekoračeno.
 * @param key  npr. `signup:1.2.3.4`
 * @param limit maksimalan broj zahtjeva
 * @param windowMs vremenski prozor u milisekundama
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  pruneBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    // Sigurnosni log — vidljivo u Vercel logovima (znak napada/spama)
    console.warn(`[RATE-LIMIT] ${key} — blokirano na ${limit}/${windowMs / 1000}s (pokušaj u ${now})`);
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

/** Čišćenje starih brojača (zovemo prilikom svake provjere — jeftino) */
export function pruneBuckets(now = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
