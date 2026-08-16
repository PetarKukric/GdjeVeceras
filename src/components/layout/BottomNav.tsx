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
    <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-surface/80 backdrop-blur-2xl border border-white/10 px-4 py-4 rounded-[2rem] flex justify-around items-center shadow-2xl z-50 animate-fade-up">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link 
            key={item.href}
            href={item.href} 
            className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${active ? 'text-primary' : 'text-muted hover:text-white'}`}
          >
            {active && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_#FF0080]" />
            )}
            <Icon size={20} className={`${active ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
