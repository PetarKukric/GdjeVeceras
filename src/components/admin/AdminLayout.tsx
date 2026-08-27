'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {} from 'next/navigation';
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
  XCircle
} from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';

export function AdminSidebar() {
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

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
    { name: 'Događaji', href: '/admin/events', icon: Calendar, roles: ['ADMIN', 'OWNER'] },
    { name: 'Rezervacije', href: '/admin/reservations', icon: Clock, roles: ['ADMIN'] },
    { name: 'Stolovi', href: '/admin/floor-plan', icon: MapPin, roles: ['ADMIN'] },
    { name: 'Poruke', href: '/admin/messages', icon: MessageSquare, roles: ['ADMIN'] },
    { name: 'Na čekanju', href: '/admin/events/pending', icon: AlertTriangle, roles: ['ADMIN'] },
    { name: 'Lokali', href: '/admin/venues', icon: Globe, roles: ['ADMIN'] },
    { name: 'Prijave', href: '/admin/reports', icon: Flag, roles: ['ADMIN'] },
    { name: 'Korisnici', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileToggle && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileToggle)}
        className="lg:hidden fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-2xl z-[500] shadow-2xl flex items-center justify-center border border-white/20"
      >
        <LayoutDashboard size={24} />
      </button>

      <aside className={`${isMobileToggle ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:sticky top-0 left-0 w-72 bg-surface/90 backdrop-blur-2xl border-r border-white/5 flex flex-col h-screen shadow-2xl z-[200] transition-transform duration-300`}>
      <div className="p-8 mb-4 border-b border-white/5">
        <div className="flex items-center justify-between lg:block">
            <Link href="/" className="flex items-center gap-3 group">
              <img src="/logo-final.png" alt="Gdje Večeras" className="h-12 w-auto object-contain transition-transform group-hover:scale-110" />
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] font-black text-white uppercase tracking-widest pt-1">PANEL</span>
                 <span className="text-[7px] font-black text-primary uppercase tracking-[0.3em]">GDJE VEČERAS</span>
              </div>
            </Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-muted hover:text-white transition-colors">
                <XCircle size={24} />
            </button>
        </div>
      </div>

      <ClientOnly fallback={<div className="flex-grow px-6 py-4 space-y-4 animate-pulse"><div className="h-12 bg-card rounded-2xl w-full" /></div>}>
        {user && (
          <>
            <nav className="flex-grow px-6 space-y-2">
              {navItems
                .filter(item => item.roles.includes(user.role))
                .map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-5 py-4 text-xs font-black uppercase tracking-widest text-muted hover:text-white hover:bg-card rounded-2xl transition-all group"
                  >
                    <item.icon size={20} className="group-hover:text-primary transition-colors" />
                    {item.name}
                  </Link>
                ))}
            </nav>

            <div className="p-6 border-t border-border/50 bg-card/30 m-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase">
                  {user.name.substring(0, 2)}
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-xs font-black text-white truncate uppercase tracking-tight">{user.name}</p>
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{user.role}</p>
                </div>
              </div>
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

  useEffect(() => {
    async function fetchStats() {
      try {
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
    <header className="h-20 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between px-4 md:px-10 sticky top-0 z-[100] shadow-xl">
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
         <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(255,0,128,0.5)] shrink-0" />
         <h1 className="text-sm md:text-lg font-black text-white uppercase tracking-tighter truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-6 shrink-0">
        <Link href="/admin/reports" className="p-2 text-muted hover:text-primary relative transition-colors">
          <Flag size={20} className="md:w-[22px]" />
          {reportCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-background animate-pulse">
              {reportCount}
            </span>
          )}
        </Link>
        <div className="h-10 w-px bg-white/5 mx-1 md:mx-2"></div>
        <Link 
          href="/" 
          className="px-4 md:px-6 py-2 md:py-2.5 bg-white/5 border border-white/10 rounded-xl text-[8px] md:text-[9px] font-black text-white hover:bg-primary hover:text-white hover:border-primary transition-all uppercase tracking-[0.2em] shadow-lg"
        >
          <span className="hidden sm:inline">NA SAJT</span>
          <span className="sm:hidden">SAJT</span>
        </Link>
      </div>
    </header>
  );
}
