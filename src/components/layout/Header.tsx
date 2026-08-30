'use client';

import React, { useEffect, useState } from 'react';
import { Search, Heart, MessageSquare, Clock, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { NotificationBell } from './NotificationBell';

export function Header({ initialUser = null }: { initialUser?: any }) {
  const [user, setUser] = useState(initialUser);
  const [chatUnread, setChatUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch chat unread count
  useEffect(() => {
    if (user) {
      const fetchChatUnread = async () => {
        try {
          const res = await fetch('/api/chat/list');
          if (res.ok) {
            const data = await res.json();
            const totalUnread = data.reduce((acc: number, conv: any) => acc + conv.unreadCount, 0);
            setChatUnread(totalUnread);
          }
        } catch {}
      };
      fetchChatUnread();
      const interval = setInterval(fetchChatUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const navLinks = [
    { name: 'Početna', href: '/' },
    { name: 'Događaji', href: '/events' },
    { name: 'Lokali', href: '/venues' },
    { name: 'Rezervacije', href: '/reservations' },
    { name: 'Kontakt', href: '/contact' },
  ];

  // Robust check to hide public header on admin pages
  if (!pathname || pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-[500] bg-background/60 backdrop-blur-2xl border-b border-white/5 h-16 md:h-20 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 h-full">
        <div className="flex justify-between items-center h-full">
          
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img 
              src="/logo-final.png" 
              alt="Gdje Večeras" 
              className="h-9 sm:h-12 md:h-14 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8 mx-4" aria-label="Glavna navigacija">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`text-sm font-bold transition-all tracking-wide ${
                  pathname === link.href ? 'text-primary nav-link-active' : 'text-muted hover:text-text'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <ClientOnly>
              {user && (
                <Link 
                  href="/favorites" 
                  className={`text-sm font-bold transition-all flex items-center gap-1.5 tracking-wide ${
                    pathname === '/favorites' ? 'text-white nav-link-active' : 'text-muted hover:text-text'
                  }`}
                >
                  <Heart size={16} className="text-primary" /> Sačuvano
                </Link>
              )}
            </ClientOnly>

            <ClientOnly>
              {user && (
                <Link 
                  href="/reservations" 
                  className={`text-sm font-bold transition-all flex items-center gap-1.5 tracking-wide ${
                    pathname === '/reservations' ? 'text-white nav-link-active' : 'text-muted hover:text-text'
                  }`}
                >
                  <Clock size={16} className="text-accent" /> Rezervacije
                </Link>
              )}
            </ClientOnly>
          </nav>

          <div className="flex items-center gap-2 sm:gap-6 min-w-0 shrink-0">
            <Link href="/events" className="hidden md:flex touch-target text-muted hover:text-text transition-colors" aria-label="Pretraga">
              <Search size={20} />
            </Link>

            <ClientOnly>
              {user && (
                <Link href="/chat" className="touch-target text-muted hover:text-primary transition-all relative">
                  <MessageSquare size={20} />
                  {chatUnread > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background">
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  )}
                </Link>
              )}
            </ClientOnly>
            
            <ClientOnly>
               <NotificationBell user={user} />
            </ClientOnly>

            <div className="flex items-center h-10 justify-end shrink-0">
              <ClientOnly fallback={<div className="w-10 h-10 rounded-full bg-surface/50" />}>
                {user ? (
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-xs font-bold text-white hidden lg:block truncate max-w-[120px]">{user.name}</span>
                    <Link href="/settings" className="touch-target text-muted hover:text-primary transition-colors" title="Podešavanja" aria-label="Podešavanja">
                      <Settings size={20} />
                    </Link>
                    {(user.role === 'ADMIN' || user.role === 'OWNER') && (
                      <Link href="/admin" aria-label="Admin panel" title="Admin panel" className="shrink-0 flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:px-5 sm:py-2 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">
                        <LayoutDashboard size={18} className="sm:hidden" />
                        <span className="hidden sm:inline">Admin</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link href="/login" className="px-6 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
                      Prijava
                    </Link>
                    <Link href="/signup" className="hidden sm:block px-6 py-2.5 bg-surface border border-border/50 text-white text-xs font-black rounded-xl hover:border-muted transition-all uppercase tracking-widest">
                      Registracija
                    </Link>
                  </div>
                )}
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
