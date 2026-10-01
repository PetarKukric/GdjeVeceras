/**
 * Večeras Score — pravila bodovanja (dijeli se između klijenta i servera, bez Prisme).
 */

// Pragovi su skalirani na bodovanje 10/30 po izlasku (≈ 3, 15 i 50 partner izlazaka)
export const TIERS = [
  { key: 'rookie', min: 0 },
  { key: 'regular', min: 100 },
  { key: 'nightOwl', min: 500 },
  { key: 'legend', min: 1500 },
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const CHECKIN_RULES = {
  /** Jedan check-in (bilo gdje) u 12h */
  cooldownHours: 12,
  /** Osnovni bodovi za svaki lokal */
  basePoints: 10,
  /** Partner lokal ili lokal boostovan za vikend: ukupno 30 (osnova + 20) */
  partnerBonus: 20,
  boostBonus: 20,
  /** Fotka + lokacija: moraš biti unutar ovog radijusa od lokala (+ tolerancija GPS preciznosti) */
  photoRadiusM: 150,
  maxAccuracyToleranceM: 150,
  /** QR skeniran dalje od ovoga (ako je lokacija poslana) se odbija — neko skenira fotku QR koda od kuće */
  qrMaxDistanceM: 2000,
  /** Niz vikenda: od 3 zaredom ×1.5, pa +0.5 na svaka još 2 vikenda (5 → ×2, 7 → ×2.5…) */
  streakStartWeekends: 3,
  streakStartMultiplier: 1.5,
  streakStepWeekends: 2,
  streakStep: 0.5,
  /** Račun se može prijaviti do ovoliko sati nakon check-ina u tom lokalu */
  receiptWindowHours: 12,
} as const;

/** Množilac za niz vikenda (1 = bez bonusa) */
export function streakMultiplier(weekends: number): number {
  const r = CHECKIN_RULES;
  if (weekends < r.streakStartWeekends) return 1;
  return r.streakStartMultiplier + r.streakStep * Math.floor((weekends - r.streakStartWeekends) / r.streakStepWeekends);
}

export function isBoosted(venue: { boostedUntil?: string | Date | null }, now = Date.now()): boolean {
  return Boolean(venue.boostedUntil) && new Date(venue.boostedUntil as string | Date).getTime() > now;
}

/** Bodovi za check-in prije množioca niza: 10 svuda, 30 partner ili boost (oba = 50) */
export function venuePoints(venue: { isPartner?: boolean | null; boostedUntil?: string | Date | null }, now = Date.now()): number {
  const r = CHECKIN_RULES;
  return r.basePoints + (venue.isPartner ? r.partnerBonus : 0) + (isBoosted(venue, now) ? r.boostBonus : 0);
}

const SARAJEVO_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Sarajevo', year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });

/** Lokalni (Sarajevo) dan kao broj dana od epohe + dan u sedmici (0 = ned) */
function localDay(date: Date): { day: number; weekday: number; y: number; m: number } {
  const parts = Object.fromEntries(SARAJEVO_PARTS.formatToParts(date).map((p) => [p.type, p.value]));
  const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day);
  return { day: Math.round(Date.UTC(y, m - 1, d) / 86400000), weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday), y, m };
}

/** Ključ vikenda (dan petka) za check-in u pet/sub/ned po sarajevskom vremenu, inače null */
export function weekendKey(date: Date): number | null {
  const { day, weekday } = localDay(date);
  if (weekday === 5) return day;
  if (weekday === 6) return day - 1;
  if (weekday === 0) return day - 2;
  return null;
}

/** Posljednji vikend koji je počeo do ovog trenutka (tekući ako je vikend) */
export function latestWeekendKey(date = new Date()): number {
  const { day, weekday } = localDay(date);
  return day - ((weekday - 5 + 7) % 7);
}

/** Broj uzastopnih vikenda sa izlaskom, računajući od referentnog vikenda unazad */
export function countWeekendStreak(keys: Set<number>, fromKey: number): number {
  let n = 0;
  for (let k = fromKey; keys.has(k); k -= 7) n++;
  return n;
}

/** Mjesec "YYYY-MM" po sarajevskom vremenu */
export function monthKey(date = new Date()): string {
  const { y, m } = localDay(date);
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function previousMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function tierInfo(totalPoints: number) {
  let index = 0;
  TIERS.forEach((tier, i) => { if (totalPoints >= tier.min) index = i; });
  const current = TIERS[index];
  const next = TIERS[index + 1] ?? null;
  const progress = next ? Math.min(1, (totalPoints - current.min) / (next.min - current.min)) : 1;
  return { index, current, next, progress, toNext: next ? next.min - totalPoints : 0 };
}

/** Haversine udaljenost u metrima */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** Početak sedmice (ponedjeljak 00:00 UTC) — rang lista se resetuje svakog ponedjeljka */
export function weekStart(date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7; // pon = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

/** Inicijali za avatar */
export function initials(name: string | null | undefined): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts[1]?.[0] || '')).toUpperCase();
}
