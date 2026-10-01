'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, QrCode, Trophy, User } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/chat')) return null;
  // Na auth stranicama (prije prijave) donja traka nema smisla — sve ostalo je iza prijave
  if (['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'].some((p) => pathname.startsWith(p))) return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const items = [
    { href: '/', label: t('nav.tonight'), Icon: Home },
    { href: '/events', label: t('nav.events'), Icon: CalendarDays },
    { href: '/checkin', label: t('nav.checkin'), Icon: QrCode, scan: true },
    { href: '/leaderboard', label: t('nav.rank'), Icon: Trophy },
    { href: '/profile', label: t('nav.profile'), Icon: User },
  ];

  return (
    <nav className="tabbar" aria-label={t('nav.app')}>
      {items.map(({ href, label, Icon, scan }) => (
        scan ? (
          <Link key={href} href={href} className="tabbar__scan" aria-label={label} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon className="ic" aria-hidden="true" />
          </Link>
        ) : (
          <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
            <Icon className="ic" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      ))}
    </nav>
  );
}
