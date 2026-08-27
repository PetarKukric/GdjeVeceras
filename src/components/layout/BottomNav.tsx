'use client';

import React from 'react';
import { Home, Search, Bookmark, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: 'DOM', href: '/', icon: Home },
    { label: 'DOGAĐAJI', href: '/events', icon: Search },
    { label: 'LOKALI', href: '/venues', icon: MapPin },
    { label: 'SAČUVANO', href: '/favorites', icon: Bookmark },
    { label: 'REZERVACIJE', href: '/reservations', icon: Clock },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe">
      <div className="mx-auto w-full max-w-md bg-surface/85 backdrop-blur-2xl border border-white/10 px-2 py-2.5 mb-3 rounded-3xl flex justify-around items-center shadow-2xl animate-fade-up">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link 
            key={item.href}
            href={item.href} 
            className={`touch-target flex flex-col items-center justify-center gap-1 px-2 py-1 transition-all duration-300 relative min-w-[52px] ${active ? 'text-primary' : 'text-muted hover:text-white'}`}
          >
            {active && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            )}
            <Icon size={21} className={`${active ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
