'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_COOKIE, formatNumber, htmlLang, makeT, type Lang, type TFunction } from '@/lib/i18n';

interface LangContextValue {
  lang: Lang;
  t: TFunction;
  fmt: (value: number) => string;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const router = useRouter();

  const setLang = useCallback((next: Lang) => {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = htmlLang(next);
    setLangState(next);
    // Serverske komponente (metadata, profil, rang lista) se ponovo renderuju na novom jeziku
    router.refresh();
  }, [router]);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    t: makeT(lang),
    fmt: (n: number) => formatNumber(lang, n),
    setLang,
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t('common.language')}>
      {(['sr', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => lang !== code && setLang(code)}
          className={lang === code ? 'is-on' : ''}
        >
          {code === 'sr' ? 'SR' : 'EN'}
        </button>
      ))}
    </div>
  );
}
