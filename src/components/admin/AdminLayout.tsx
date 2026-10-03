'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, MapPin, Flag, Users, LogOut, Globe, MessageSquare, AlertTriangle,
  X, Upload, Menu, QrCode, Gift, Receipt, ExternalLink, Download,
} from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { Avatar } from '@/components/ui/Avatar';

type NavItem = { name: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; roles: string[] };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Upravljanje',
    items: [
      { name: 'Kontrolna tabla', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN'] },
      { name: 'Događaji', href: '/admin/events', icon: Calendar, roles: ['ADMIN', 'OWNER'] },
    ],
  },
  {
    label: 'Večeras Score',
    items: [
      { name: 'Check-in, QR, boost', href: '/admin/checkin', icon: QrCode, roles: ['ADMIN', 'OWNER'] },
      { name: 'Nagrade i kodovi', href: '/admin/rewards', icon: Gift, roles: ['ADMIN', 'OWNER'] },
      { name: 'Računi za bonus', href: '/admin/receipts', icon: Receipt, roles: ['ADMIN', 'OWNER'] },
    ],
  },
  {
    label: 'Administracija',
    items: [
      { name: 'Na čekanju', href: '/admin/events/pending', icon: AlertTriangle, roles: ['ADMIN'] },
      { name: 'Lokali', href: '/admin/venues', icon: MapPin, roles: ['ADMIN'] },
      { name: 'Poruke', href: '/admin/messages', icon: MessageSquare, roles: ['ADMIN'] },
      { name: 'Masovni uvoz', href: '/admin/import', icon: Upload, roles: ['ADMIN'] },
      { name: 'Izvoz podataka', href: '/admin/export', icon: Download, roles: ['ADMIN'] },
      { name: 'Prijave', href: '/admin/reports', icon: Flag, roles: ['ADMIN'] },
      { name: 'Korisnici', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  // /admin/events ne smije biti aktivan kad je otvoren /admin/events/pending
  if (href === '/admin/events') return pathname === '/admin/events' || /^\/admin\/events\/(new|[^/]+)$/.test(pathname) && !pathname.endsWith('/pending');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname() || '';
  const panelRef = useRef<HTMLElement>(null);
  const [user, setUser] = useState<{ id: string; email: string; role: string; name: string; avatarUrl?: string | null } | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsMobileOpen(true);
    window.addEventListener('gv-panel-open', open);
    return () => window.removeEventListener('gv-panel-open', open);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session').then((res) => (res.ok ? res.json() : null)).then((data) => data && setUser(data.user)).catch(() => {});
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
      if (event.key !== 'Tab') return;
      const elements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []).filter((el) => el.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', handler); previous?.focus(); };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <>
      {isMobileOpen && <div className="adm-backdrop lg:hidden" onClick={() => setIsMobileOpen(false)} />}
      <aside
        ref={panelRef}
        aria-label="Meni panela"
        aria-modal={isMobileOpen || undefined}
        role={isMobileOpen ? 'dialog' : undefined}
        className={`adm-side panel-sidebar ${isMobileOpen ? 'is-open' : ''}`}
      >
        <div className="adm-side__brand">
          <Link href="/" className="brand">
            <img src="/brand/logo-96.png" alt="" width="36" height="36" />
            <span className="brand__name">Gdje<span>Večeras</span></span>
          </Link>
          <span className="adm-side__tag">Panel</span>
          <button aria-label="Zatvori meni" onClick={() => setIsMobileOpen(false)} className="adm-side__close lg:hidden"><X size={20} /></button>
        </div>

        <ClientOnly fallback={<div className="adm-side__nav"><div className="skel" style={{ minHeight: 240 }} /></div>}>
          {user && (
            <>
              <nav className="adm-side__nav">
                {NAV_GROUPS.map((group) => {
                  const items = group.items.filter((item) => item.roles.includes(user.role));
                  if (!items.length) return null;
                  return (
                    <div key={group.label} className="adm-side__group">
                      <p>{group.label}</p>
                      {items.map((item) => {
                        const active = isActive(pathname, item.href);
                        return (
                          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className="adm-side__link">
                            <item.icon size={18} />{item.name}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>

              <div className="adm-side__foot">
                <div className="adm-side__me">
                  <Avatar name={user.name} url={user.avatarUrl} className="row__av" />
                  <div>
                    <b>{user.name}</b>
                    <small>{user.role === 'ADMIN' ? 'Administrator' : 'Vlasnik lokala'}</small>
                  </div>
                </div>
                <Link href="/" className="adm-side__link"><Globe size={18} />Otvori sajt</Link>
                <button onClick={handleLogout} className="adm-side__link adm-side__logout"><LogOut size={18} />Odjavi se</button>
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
        if (res.ok) setReportCount((await res.json()).pendingReports || 0);
      } catch {}
    }
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="adm-head">
      <div className="adm-head__title">
        <button className="lg:hidden adm-head__menu" aria-label="Otvori meni panela" onClick={() => window.dispatchEvent(new Event('gv-panel-open'))}><Menu size={22} /></button>
        <h1>{title}</h1>
      </div>
      <div className="adm-head__actions">
        {isAdmin && (
          <Link href="/admin/reports" className="adm-head__icon" aria-label={`Prijave (${reportCount})`}>
            <Flag size={19} />
            {reportCount > 0 && <span className="adm-head__badge">{reportCount}</span>}
          </Link>
        )}
        <Link href="/" className="btn btn--ghost btn--sm"><ExternalLink className="ic" aria-hidden="true" /><span className="hidden sm:inline">Otvori sajt</span><span className="sm:hidden">Sajt</span></Link>
      </div>
    </header>
  );
}
