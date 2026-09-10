'use client';

import React, { useEffect, useState } from 'react';
import { Search, Heart, MessageSquare, Clock, Settings, LayoutDashboard, Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { NotificationBell } from './NotificationBell';

export function Header({ initialUser = null }: { initialUser?: any }) {
  const [user, setUser] = useState(initialUser);
  const [chatUnread, setChatUnread] = useState(0);
  const [resending, setResending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
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

  const resendVerification = async () => {
    if (!user?.email || resending) return;
    setResending(true);
    setVerificationMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      setVerificationMessage(data.message || data.error || 'Pokušaj ponovo kasnije.');
    } catch {
      setVerificationMessage('Slanje trenutno nije uspjelo.');
    } finally {
      setResending(false);
    }
  };

  const navLinks = [
    { name: 'Početna', href: '/' },
    { name: 'Događaji', href: '/events' },
    { name: 'Lokali', href: '/venues' },
    { name: 'Rezerviši sto', href: '/events?reservations=available' },
    { name: 'Kontakt', href: '/contact' },
  ];

  // Robust check to hide public header on admin pages
  if (!pathname || pathname.startsWith('/admin')) return null;

  return (
    <>
    <header className="sticky top-0 z-[500] h-16 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-full flex justify-between items-center gap-3">
        <Link href="/" aria-label="GdjeVečeras početna"><img src="/logo-final.png" alt="GdjeVečeras" className="h-11 w-auto max-w-36 object-contain"/></Link>
        <nav className="hidden lg:flex gap-5 text-sm" aria-label="Glavna navigacija">{navLinks.map(item=><Link key={item.href} href={item.href} className={pathname === item.href ? 'text-primary' : 'text-muted'}>{item.name}</Link>)}</nav>
        <div className="flex items-center gap-2">
          <ClientOnly><NotificationBell user={user}/></ClientOnly>
          <details className="profile-menu" onKeyDown={e=>{if(e.key==='Escape') {e.currentTarget.open=false; e.currentTarget.querySelector('summary')?.focus();}}}>
            <summary aria-label="Profil i meni"><Settings size={22}/></summary>
            <div onClick={e=>{if((e.target as HTMLElement).closest('a')) {const details=e.currentTarget.closest('details');if(details)details.open=false;}}}>
              {user ? <><p className="px-3 py-2 text-sm break-words">{user.name}</p>
              <Link href="/settings"><Settings size={18}/>Podešavanja</Link>
              <Link href="/chat"><MessageSquare size={18}/>Poruke {chatUnread > 0 ? `(${chatUnread})` : ''}</Link>
              <Link href="/favorites"><Heart size={18}/>Sačuvano</Link>
              <Link href="/reservations"><Clock size={18}/>Moje rezervacije</Link>
              {(user.role === 'ADMIN' || user.role === 'OWNER') && <Link href={user.role === 'OWNER' ? '/admin/events' : '/admin'}><LayoutDashboard size={18}/>Panel</Link>}
              </> : <><Link href="/login">Prijava</Link><Link href="/signup">Registracija</Link></>}
              <Link href="/events?reservations=available">Rezerviši sto</Link><Link href="/contact">Kontakt</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
    {user && user.emailVerified === false && (
      <div className="relative z-[490] border-b border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-center text-xs text-amber-100">
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          <Mail size={14} />
          Potvrdi email da bi mogao rezervisati, komentarisati i koristiti chat.
          <button onClick={resendVerification} disabled={resending} className="font-black text-white underline underline-offset-4 disabled:opacity-50">
            {resending ? <Loader2 size={13} className="animate-spin" /> : 'Pošalji ponovo'}
          </button>
          {verificationMessage && <span className="text-amber-200">{verificationMessage}</span>}
        </span>
      </div>
    )}
    </>
  );
}
