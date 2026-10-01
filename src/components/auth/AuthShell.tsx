'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Gift, QrCode, Trophy } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

/** Dvodijelni auth ekran: lijevo brend + pogodnosti naloga, desno forma */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <main className="auth">
      <div className="auth__side">
        <div className="hero__glow" aria-hidden="true" />
        <div style={{ position: 'relative' }}>
          <h2 className="hero__title">{t('home.title1')} <em>{t('home.title2')}</em></h2>
          <ul className="auth__perks">
            <li><QrCode className="ic" aria-hidden="true" />{t('auth.perk1')}</li>
            <li><Gift className="ic" aria-hidden="true" />{t('auth.perk2')}</li>
            <li><Trophy className="ic" aria-hidden="true" />{t('auth.perk3')}</li>
          </ul>
        </div>
      </div>
      <div className="auth__main">
        <div className="auth__card">{children}</div>
      </div>
    </main>
  );
}

/** Sigurna "next" putanja nakon prijave (samo relativne putanje na istom sajtu) */
export function safeNext(): string | null {
  if (typeof window === 'undefined') return null;
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/>
  </svg>
);

/** "Nastavi sa Google" + razdjelnik + poruka o grešci iz ?error= (vraća je Google callback) */
export function GoogleSection({ t }: { t: (key: string) => string }) {
  const [href, setHref] = useState('/api/auth/google');
  const [error, setError] = useState('');
  useEffect(() => {
    const next = safeNext();
    if (next) setHref(`/api/auth/google?next=${encodeURIComponent(next)}`);
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) {
      const key = `auth.oauthErrors.${code}`;
      const text = t(key);
      setError(text === key ? t('auth.oauthErrors.google_failed') : text);
    }
  }, [t]);
  return (
    <>
      {error && <div className="alert alert--error" role="alert" style={{ marginTop: 20 }}><AlertCircle className="ic" aria-hidden="true" />{error}</div>}
      {/* Običan <a> (ne next/link): ide na API rutu koja preusmjerava na Google */}
      <a href={href} className="btn btn--white btn--block" style={{ marginTop: 24 }}>
        <GoogleG />{t('auth.google')}
      </a>
      <div className="auth__or"><span>{t('auth.or')}</span></div>
    </>
  );
}
