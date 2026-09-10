'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Flag,
  Users,
  LogOut,
  Clock,
  Globe,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Upload, Menu
} from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';

export function AdminSidebar() {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const open = () => setIsMobileMenuOpen(true);
    window.addEventListener('gv-panel-open', open);
    return () => window.removeEventListener('gv-panel-open', open);
  }, []);
  const [user, setUser] = useState<{ id: string, email: string, role: string, name: string } | null>(null);
  const [isMobileToggle, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    }
    fetchSession();
  }, []);

  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isMobileToggle) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
      if (event.key !== 'Tab') return;
      const elements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []).filter(el => el.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [isMobileToggle]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Kontrolna tabla', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
    { name: 'Događaji', href: '/admin/events', icon: Calendar, roles: ['ADMIN', 'OWNER'] },
    { name: 'Rezervacije', href: '/admin/reservations', icon: Clock, roles: ['ADMIN', 'OWNER'] },
    { name: 'Stolovi', href: '/admin/floor-plan', icon: MapPin, roles: ['ADMIN', 'OWNER'] },
    { name: 'Poruke', href: '/admin/messages', icon: MessageSquare, roles: ['ADMIN'] },
    { name: 'Na čekanju', href: '/admin/events/pending', icon: AlertTriangle, roles: ['ADMIN'] },
    { name: 'Lokali', href: '/admin/venues', icon: Globe, roles: ['ADMIN'] },
    { name: 'Masovni uvoz', href: '/admin/import', icon: Upload, roles: ['ADMIN'] },
    { name: 'Prijave', href: '/admin/reports', icon: Flag, roles: ['ADMIN'] },
    { name: 'Korisnici', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileToggle && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[650] animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside ref={panelRef} aria-label="Meni panela" aria-modal={isMobileToggle || undefined} role={isMobileToggle ? "dialog" : undefined} className={`${isMobileToggle ? 'translate-x-0' : '-translate-x-full invisible lg:visible lg:translate-x-0'} panel-sidebar fixed lg:sticky top-0 left-0 w-[85vw] max-w-80 lg:w-64 bg-surface/90 backdrop-blur-2xl border-r border-white/5 flex flex-col h-dvh overflow-y-auto z-[700] transition-transform duration-300`}>
      <div className="p-4 mb-2 border-b border-white/5">
        <div className="flex items-center justify-between lg:block">
            <Link href="/" className="flex items-center gap-3 group">
              <img src="/logo-final.png" alt="Gdje Večeras" className="h-12 w-auto object-contain transition-transform group-hover:scale-110" />
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest pt-1">PANEL</span>
                 <span className="text-[7px] font-black text-primary uppercase tracking-[0.3em]">GDJE VEČERAS</span>
              </div>
            </Link>
            <button aria-label="Zatvori meni" onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-muted hover:text-white transition-colors">
                <XCircle size={24} />
            </button>
        </div>
      </div>

      <ClientOnly fallback={<div className="flex-grow px-6 py-4 space-y-4 animate-pulse"><div className="h-12 bg-card rounded-2xl w-full" /></div>}>
        {user && (
          <>
            <nav className="flex-grow px-3 space-y-1">
              <p className="px-3 pt-2 pb-1 text-xs text-muted">Upravljanje</p>
              {navItems
                .filter(item => item.roles.includes(user.role))
                .map((item) => (
                  <React.Fragment key={item.name}>{item.name === 'Na čekanju' && <p className="px-3 pt-5 pb-2 text-xs text-muted">Administracija</p>}<Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined} className={`flex items-center gap-3 px-3 min-h-12 text-sm font-medium rounded-xl ${pathname === item.href ? "bg-primary/10 text-primary" : "text-muted hover:bg-card"}`}
                  >
                    <item.icon size={20} className="group-hover:text-primary transition-colors" />
                    {item.name}
                  </Link></React.Fragment>
                ))}
            </nav>

            <div className="p-4 border-t border-border mt-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase">
                  {user.name.substring(0, 2)}
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-xs font-black text-white truncate uppercase tracking-tight">{user.name}</p>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{user.role}</p>
                </div>
              </div>
              <Link href="/" className="flex min-h-11 items-center gap-2 text-sm"><Globe size={18}/> Otvori sajt</Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 hover:bg-pink-500/10 rounded-xl transition-all"
              >
                <LogOut size={18} />
                Odjavi se
              </button>
            </div>
          </>
        )}
      </ClientOnly>
    </aside>
    </>
  );
}

export function AdminHeader({ title }: { title: string }) {
  const [reportCount, setReportCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const session = await fetch('/api/auth/session');
        const account = session.ok ? await session.json() : null;
        if (account?.user?.role !== 'ADMIN') return;
        setIsAdmin(true);
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setReportCount(data.pendingReports || 0);
        }
      } catch {}
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Check once per minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 md:px-10 sticky top-0 z-[100] ">
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
         <button className="lg:hidden min-w-11 min-h-11 grid place-items-center" aria-label="Otvori meni panela" onClick={() => window.dispatchEvent(new Event('gv-panel-open'))}><Menu size={22}/></button>
         <h1 className="text-sm md:text-lg font-bold text-white truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        {isAdmin && <Link href="/admin/reports" className="p-2 text-muted hover:text-primary relative transition-colors">
          <Flag size={20} className="md:w-[22px]" />
          {reportCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background animate-pulse">
              {reportCount}
            </span>
          )}
        </Link>}
        <div className="h-10 w-px bg-white/5 mx-1 md:mx-2"></div>
        <Link
          href="/"
          className="px-4 md:px-6 py-2 md:py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] md:text-[10px] font-black text-white hover:bg-primary hover:text-white hover:border-primary transition-all uppercase tracking-[0.2em] shadow-lg"
        >
          <span className="hidden sm:inline">Otvori sajt</span>
          <span className="sm:hidden">Sajt</span>
        </Link>
      </div>
    </header>
  );
}
