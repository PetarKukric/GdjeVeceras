/**
 * Gosti mogu razgledati sajt bez naloga. Kad pokušaju nešto što traži nalog
 * (sačuvaj, čekiraj se, komentar...), šaljemo ih na registraciju sa razlogom,
 * a signup stranica objasni šta dobijaju. Nakon registracije vraćaju se na `next`.
 */
export const GUEST_REASONS = ['save', 'checkin', 'comment', 'follow', 'rewards', 'report', 'profile', 'chat'] as const;
export type GuestReason = (typeof GUEST_REASONS)[number];

export function signupUrl(reason: GuestReason, next?: string): string {
  const target = next ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const params = new URLSearchParams({ reason });
  if (target && target !== '/') params.set('next', target);
  return `/signup?${params.toString()}`;
}

export function goSignup(reason: GuestReason, next?: string): void {
  window.location.href = signupUrl(reason, next);
}
