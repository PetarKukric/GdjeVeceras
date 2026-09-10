'use client';

import React from 'react';
import Link from 'next/link';
import { Music, Disc3, Martini, Building2, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { name: 'Klubovi', icon: Building2, href: '/venues?type=clubs' },
  { name: 'Muzika uživo', icon: Music, href: '/events?category=LIVE_MUSIC' },
  { name: 'Koncerti', icon: Music, href: '/events?category=CONCERT' },
  { name: 'Žurke', icon: Disc3, href: '/events?category=PARTY' },
  { name: 'Kafići / Barovi', icon: Martini, href: '/venues?type=bars' },
  { name: 'Ostalo', icon: Sparkles, href: '/events' },
];

/** KATEGORIJE kartice po referenci: tamne, suptilan border, pink ikona, hover pink border. */
export function CategoryCards({ selectedCity = '' }: { selectedCity?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.name}
          href={`${cat.href}${selectedCity ? `${cat.href.includes('?') ? '&' : '?'}city=${selectedCity}` : ''}`}
          className="shrink-0 min-h-11 bg-card border border-border rounded-xl px-4 flex items-center gap-2 hover:border-primary"
        >
          <span className="text-muted">
            <cat.icon size={18} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-text">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
