'use client';

import React from 'react';
import Link from 'next/link';

// Prepoznatljive socijalne ikone (inline SVG, bez extra paketa)
const Instagram = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const Facebook = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TikTok = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

/** Footer po referenci: logo + tagline, NAVIGACIJA, POMOĆ, PRATITE NAS. */
export function Footer() {
  const link = 'text-sm font-medium text-muted hover:text-primary transition-colors';
  const heading = 'text-[10px] font-black text-white uppercase tracking-[0.3em] mb-5';

  return (
    <footer className="border-t border-border bg-background mt-16 md:mt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="space-y-5">
            <Link href="/" aria-label="Gdje Večeras — početna">
              <img src="/logo-final.png" alt="Gdje Večeras" className="h-12 w-auto object-contain" />
            </Link>
            <p className="text-white text-sm font-black uppercase tracking-widest">
              Pronađi. <span className="text-primary">Izaberi.</span> Izađi.
            </p>
            <p className="text-muted-2 text-xs">© 2026 Gdje Večeras. Sva prava zadržana.</p>
          </div>

          <nav aria-label="Navigacija">
            <h4 className={heading}>Navigacija</h4>
            <div className="flex flex-col gap-3">
              <Link href="/" className={link}>Početna</Link>
              <Link href="/events" className={link}>Događaji</Link>
              <Link href="/venues" className={link}>Lokali</Link>
              <Link href="/reservations" className={link}>Rezervacije</Link>
              <Link href="/contact" className={link}>Kontakt</Link>
            </div>
          </nav>

          <nav aria-label="Pomoć">
            <h4 className={heading}>Pomoć</h4>
            <div className="flex flex-col gap-3">
              <Link href="/faq" className={link}>FAQ — česta pitanja</Link>
              <Link href="/how-it-works" className={link}>Kako funkcioniše</Link>
              <Link href="/terms" className={link}>Uslovi korištenja</Link>
              <Link href="/privacy" className={link}>Politika privatnosti</Link>
            </div>
          </nav>

          <div>
            <h4 className={heading}>Pratite nas</h4>
            <div className="flex gap-3">
              <a href="https://www.instagram.com/gdjeveceras" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="touch-target w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-all">
                <Instagram />
              </a>
              <a href="https://www.tiktok.com/@gdjeveceras2" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="touch-target w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-all">
                <TikTok />
              </a>
              <a href="https://www.facebook.com/share/1EaMwFTjic/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="touch-target w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-all">
                <Facebook />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="pb-24 md:pb-0" aria-hidden="true" />
    </footer>
  );
}
