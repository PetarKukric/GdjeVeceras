'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LangSwitch, useLang } from '@/components/i18n/LangProvider';

// Prepoznatljive socijalne ikone (inline SVG, bez extra paketa)
const Instagram = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const Facebook = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TikTok = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

export function Footer() {
  const { t } = useLang();
  const pathname = usePathname();
  if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/chat')) return null;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <Link className="brand" href="/" aria-label={t('nav.homeAria')}>
              <img src="/brand/logo-96.png" alt="" width="36" height="36" />
              <span className="brand__name">Gdje<span>Večeras</span></span>
            </Link>
            <p className="footer__tag">{t('footer.tag1')} <span>{t('footer.tag2')}</span> {t('footer.tag3')}</p>
            <div className="footer__social" style={{ marginTop: 18 }}>
              <a href="https://www.instagram.com/gdjeveceras" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram /></a>
              <a href="https://www.tiktok.com/@gdjeveceras2" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTok /></a>
              <a href="https://www.facebook.com/share/1EaMwFTjic/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook /></a>
            </div>
          </div>

          <nav aria-label={t('footer.explore')}>
            <h4>{t('footer.explore')}</h4>
            <div className="footer__nav">
              <Link href="/events">{t('nav.events')}</Link>
              <Link href="/venues">{t('nav.venues')}</Link>
              <Link href="/favorites">{t('nav.saved')}</Link>
            </div>
          </nav>

          <nav aria-label={t('footer.score')}>
            <h4>{t('footer.score')}</h4>
            <div className="footer__nav">
              <Link href="/checkin">{t('nav.checkin')}</Link>
              <Link href="/rewards">{t('nav.rewards')}</Link>
              <Link href="/leaderboard">{t('nav.leaderboard')}</Link>
              <Link href="/contact">{t('footer.forVenues')}</Link>
            </div>
          </nav>

          <nav aria-label={t('footer.help')}>
            <h4>{t('footer.help')}</h4>
            <div className="footer__nav">
              <Link href="/faq">{t('footer.faq')}</Link>
              <Link href="/how-it-works">{t('footer.how')}</Link>
              <Link href="/terms">{t('footer.terms')}</Link>
              <Link href="/privacy">{t('footer.privacy')}</Link>
              <Link href="/contact">{t('footer.contact')}</Link>
            </div>
          </nav>
        </div>
        <div className="footer__note">
          <span>© 2026 Gdje Večeras. {t('footer.drinkResponsibly')}</span>
          <LangSwitch />
        </div>
      </div>
    </footer>
  );
}
