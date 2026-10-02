'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MessageSquare, Settings, LayoutDashboard, Loader2, Zap, User, QrCode, Gift, LogOut, Trophy } from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { LangSwitch, useLang } from '@/components/i18n/LangProvider';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from './NotificationBell';

interface HeaderUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  points?: number;
  totalPoints?: number;
  avatarUrl?: string | null;
}

/** Nakon check-ina / zamjene nagrade: window.dispatchEvent(new CustomEvent('gv-score', { detail: { balance, total } })) */
export const SCORE_EVENT = 'gv-score';

export function Header({ initialUser = null }: { initialUser?: HeaderUser | null }) {
  const { t, fmt } = useLang();
  const [user, setUser] = useState<HeaderUser | null>(initialUser);
  const [chatUnread, setChatUnread] = useState(0);
  const [resending, setResending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [bump, setBump] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScore = (event: Event) => {
      const detail = (event as CustomEvent<{ balance?: number; total?: number; avatarUrl?: string | null }>).detail;
      setUser((prev) => (prev ? { ...prev, points: detail.balance ?? prev.points, totalPoints: detail.total ?? prev.totalPoints, avatarUrl: detail.avatarUrl !== undefined ? detail.avatarUrl : prev.avatarUrl } : prev));
      if (detail.balance !== undefined) { setBump(false); requestAnimationFrame(() => setBump(true)); }
    };
    window.addEventListener(SCORE_EVENT, onScore);
    return () => window.removeEventListener(SCORE_EVENT, onScore);
  }, []);

  // Zatvori meni pri navigaciji
  useEffect(() => { if (menuRef.current) menuRef.current.open = false; }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchChatUnread = async () => {
      try {
        const res = await fetch('/api/chat/list');
        if (res.ok) {
          const data = await res.json();
          setChatUnread(data.reduce((acc: number, conv: { unreadCount: number }) => acc + conv.unreadCount, 0));
        }
      } catch {}
    };
    fetchChatUnread();
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') fetchChatUnread(); };
    const interval = setInterval(refreshWhenVisible, 30000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible); };
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
      setVerificationMessage(data.message || data.error || t('common.tryLater'));
    } catch {
      setVerificationMessage(t('common.tryLater'));
    } finally {
      setResending(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  };

  if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/chat')) return null;

  const navLinks = [
    { name: t('nav.tonight'), href: '/' },
    { name: t('nav.events'), href: '/events' },
    { name: t('nav.venues'), href: '/venues' },
    { name: t('nav.rewards'), href: '/rewards' },
    { name: t('nav.leaderboard'), href: '/leaderboard' },
  ];
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__inner">
          <Link className="brand" href="/" aria-label={t('nav.homeAria')}>
            <img src="/brand/logo-96.png" alt="" width="40" height="40" />
            <span className="brand__name">Gdje<span>Večeras</span></span>
          </Link>

          <nav className="nav" aria-label={t('nav.main')}>
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? 'page' : undefined}>{item.name}</Link>
            ))}
          </nav>

          <div className="topbar__actions">
            <LangSwitch className="hide-md" />
            {user ? (
              <>
                <Link href="/profile" className={`score-pill${bump ? ' is-bump' : ''}`} aria-label={t('score.yourScore', { n: fmt(user.points ?? 0) })} onAnimationEnd={() => setBump(false)}>
                  <Zap className="ic" aria-hidden="true" />
                  <span>{fmt(user.points ?? 0)}</span>
                </Link>
                <ClientOnly><NotificationBell user={user} /></ClientOnly>
                <details className="menu" ref={menuRef} onKeyDown={(e) => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
                  <summary aria-label={t('nav.menu')}><Avatar name={user.name} url={user.avatarUrl} /></summary>
                  <div className="menu__panel">
                    <div className="menu__who">
                      <b>{user.name || user.email}</b>
                      <small>{t('score.points', { n: fmt(user.points ?? 0) })}</small>
                    </div>
                    <Link href="/profile"><User className="ic" />{t('nav.profile')}</Link>
                    <Link href="/checkin"><QrCode className="ic" />{t('nav.checkin')}</Link>
                    <Link href="/rewards"><Gift className="ic" />{t('nav.rewards')}</Link>
                    <Link href="/leaderboard"><Trophy className="ic" />{t('nav.leaderboard')}</Link>
                    <div className="menu__sep" />
                    <Link href="/chat"><MessageSquare className="ic" />{t('nav.messages')}{chatUnread > 0 ? ` (${chatUnread})` : ''}</Link>
                    <Link href="/favorites"><Heart className="ic" />{t('nav.saved')}</Link>
                    <Link href="/settings"><Settings className="ic" />{t('nav.settings')}</Link>
                    {(user.role === 'ADMIN' || user.role === 'OWNER') && (
                      <Link href={user.role === 'OWNER' ? '/admin/events' : '/admin'}><LayoutDashboard className="ic" />{t('nav.panel')}</Link>
                    )}
                    <div className="menu__sep" />
                    <div className="menu__lang"><span>{t('common.language')}</span><LangSwitch /></div>
                    <button type="button" onClick={logout}><LogOut className="ic" />{t('nav.logout')}</button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn--ghost btn--sm">{t('nav.login')}</Link>
                <Link href="/signup" className="btn btn--pink btn--sm hide-sm">{t('nav.signup')}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      {user && user.emailVerified === false && (
        <div className="verify-bar">
          {t('auth.verifyBar')}{' '}
          <button onClick={resendVerification} disabled={resending}>
            {resending ? <Loader2 size={13} className="animate-spin inline" /> : t('auth.resend')}
          </button>
          {verificationMessage && <span> · {verificationMessage}</span>}
        </div>
      )}
    </>
  );
}
