'use client';

import React from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';

/** "VODIŠ LOKAL?" CTA kartica (po referenci) — suptilan pink vizual, ne jači od događaja. */
export function OwnerCta() {
  return (
    <div className="bg-elevated border border-border rounded-3xl p-8 flex flex-col justify-between gap-6 h-full">
      <div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6" aria-hidden="true">
          <Store size={22} />
        </div>
        <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-3">Vodiš lokal?</p>
        <p className="text-white font-bold text-lg leading-snug mb-2">
          Organizuješ žurke, svirke ili druge događaje?
        </p>
        <p className="text-muted text-sm leading-relaxed">
          Pridruži se platformi Gdje Večeras i dopri do ljudi koji traže provod.
        </p>
      </div>
      <Link
        href="/contact"
        className="inline-flex w-fit px-6 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary hover:border-primary transition-all"
      >
        Saznaj više
      </Link>
    </div>
  );
}
