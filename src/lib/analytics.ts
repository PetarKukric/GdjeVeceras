'use client';

type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Šalje isključivo tehničke, neidentifikujuće podatke u GA4.
 * `onceKey` sprečava duplo brojanje pregleda tokom re-rendera i navigacije nazad.
 */
export function trackEvent(
  name: string,
  params: Record<string, AnalyticsValue> = {},
  onceKey?: string,
) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  if (onceKey) {
    const storageKey = `gv-analytics:${onceKey}`;
    try { if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, '1'); } catch {}
  }

  window.gtag('event', name, params);
}
