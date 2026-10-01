'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Tranzicija između stranica: pink stubovi se spuštaju/dižu sa lijeve i desne strane
 * prema sredini (dva srednja su crna da se logo vidi), u sredini iskoči logo, nova stranica se učita ispod, pa se stubovi
 * razilaze od sredine ka ivicama.
 *
 * Presrećemo klik na interne linkove (capture faza, prije Next <Link>-a), pokrećemo
 * "zatvaranje", pa tek onda router.push — tako se nova stranica nikad ne vidi prije
 * nego što su stubovi preko ekrana.
 */
const BARS = 6;
const COVER_MS = 520; // trajanje animacije stuba + najveće kašnjenje (vidi .pt__bar u gv.css)
const MAX_WAIT_MS = 5000; // sigurnosni izlaz ako navigacija ne promijeni putanju

type Phase = 'idle' | 'cover' | 'hold' | 'reveal';

export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const timers = useRef<number[]>([]);

  const go = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  const reveal = useCallback(() => {
    if (phaseRef.current !== 'hold' && phaseRef.current !== 'cover') return;
    go('reveal');
    later(() => go('idle'), COVER_MS + 80);
  }, [go]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (phaseRef.current !== 'idle') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || !a.href || a.hasAttribute('download')) return;
      if (a.target && a.target !== '_self') return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Samo promjena query/hash-a (filteri, sidra) — bez velike tranzicije
      if (url.pathname === window.location.pathname) return;
      if (url.pathname.startsWith('/api/')) return;
      const inPanel = (p: string) => p.startsWith('/admin') || p.startsWith('/chat');
      if (inPanel(url.pathname) && inPanel(window.location.pathname)) return;

      e.preventDefault();
      go('cover');
      later(() => {
        go('hold');
        router.push(url.pathname + url.search + url.hash);
        later(reveal, MAX_WAIT_MS);
      }, COVER_MS);
    };
    window.addEventListener('click', onClick, true);
    return () => window.removeEventListener('click', onClick, true);
  }, [go, reveal, router]);

  // Nova stranica je tu → otkrij je (mali predah da se prvi frame iscrta)
  useEffect(() => {
    if (phaseRef.current === 'hold') later(reveal, 140);
  }, [pathname, reveal]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const edge = (BARS - 1) / 2;
  return (
    <div className="pt" data-phase={phase} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => {
        const fromEdge = Math.round(edge - Math.abs(i - edge)); // 0 = ivica, max = sredina
        return (
          <span
            key={i}
            className={`pt__bar ${i % 2 ? 'pt__bar--up' : 'pt__bar--down'}${fromEdge === Math.floor(edge) ? ' pt__bar--mid' : ''}`}
            style={{ ['--in' as string]: `${fromEdge * 70}ms`, ['--out' as string]: `${(Math.round(edge) - fromEdge) * 70}ms` }}
          />
        );
      })}
      <img className="pt__logo" src="/brand/logo-512.png" alt="" width="112" height="112" />
    </div>
  );
}
