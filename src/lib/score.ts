/**
 * Večeras Score — pravila bodovanja (dijeli se između klijenta i servera, bez Prisme).
 */

export const TIERS = [
  { key: 'rookie', min: 0 },
  { key: 'regular', min: 1000 },
  { key: 'nightOwl', min: 5000 },
  { key: 'legend', min: 15000 },
] as const;

export type TierKey = (typeof TIERS)[number]['key'];

export const CHECKIN_RULES = {
  /** Isti lokal najviše jednom u 12h */
  cooldownHours: 12,
  /** Najviše 3 check-ina u 24h (zaštita od "farmanja") */
  dailyLimit: 3,
  /** Fotka + lokacija: moraš biti unutar ovog radijusa od lokala (+ tolerancija GPS preciznosti) */
  photoRadiusM: 150,
  maxAccuracyToleranceM: 150,
  /** QR skeniran dalje od ovoga (ako je lokacija poslana) se odbija — neko skenira fotku QR koda od kuće */
  qrMaxDistanceM: 2000,
  /** Bonus kad u lokalu upravo traje događaj */
  liveBonus: 50,
  /** Bonus kad se u zadnja 3h u istom lokalu čekirao neko koga pratiš */
  squadBonus: 25,
  squadWindowHours: 3,
  /** Niz: ovoliko uzastopnih sedmica sa check-inom → osnovni bodovi × multiplier */
  streakWeeks: 3,
  streakMultiplier: 1.5,
} as const;

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
