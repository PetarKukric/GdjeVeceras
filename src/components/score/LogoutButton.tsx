'use client';

import { LogOut } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

export function LogoutButton() {
  const { t } = useLang();
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  };
  return (
    <button type="button" className="btn btn--ghost btn--block" onClick={logout}>
      <LogOut className="ic" aria-hidden="true" />{t('nav.logout')}
    </button>
  );
}
