'use client';

import React from 'react';
import Link from 'next/link';
import { Music, Disc3, Martini, Building2, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { name: 'Klubovi', icon: Building2, href: '/venues' },
  { name: 'Muzika uživo', icon: Music, href: '/events?category=LIVE_MUSIC' },
  { name: 'Koncerti', icon: Music, href: '/events?category=CONCERT' },
  { name: 'Žurke', icon: Disc3, href: '/events?category=PARTY' },
  { name: 'Kafići / Barovi', icon: Martini, href: '/venues' },
  { name: 'Ostalo', icon: Sparkles, href: '/events' },
];

/** KATEGORIJE kartice po referenci: tamne, suptilan border, pink ikona, hover pink border. */
export function CategoryCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.name}
          href={cat.href}
          className="group bg-surface border border-border rounded-2xl p-5 md:p-6 flex flex-col items-center gap-3 text-center hover:bg-card hover:border-primary/40 transition-all duration-200 focus-visible:border-primary"
        >
          <span className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200">
            <cat.icon size={22} aria-hidden="true" />
          </span>
          <span className="text-xs font-black text-white uppercase tracking-widest">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
