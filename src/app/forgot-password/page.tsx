'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Loader2, Mail, MailCheck } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { useLang } from '@/components/i18n/LangProvider';
import { AuthShell } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizeEmail(email);
    if (!normalized || !isValidEmail(normalized)) { setError(t('auth.invalidEmail')); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      // Odgovor je isti bez obzira da li nalog postoji (ne otkrivamo registrovane emailove)
      if (res.ok) setSent(true);
      else setError(data.error || t('checkin.errors.server'));
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Link href="/login" className="link" style={{ minHeight: 32, marginBottom: 12 }}><ArrowLeft size={16} aria-hidden="true" />{t('forgot.back')}</Link>
      {sent ? (
        <div role="status">
          <div className="burst" style={{ margin: '8px 0 22px' }}><MailCheck className="ic" aria-hidden="true" /></div>
          <h1 className="h2">{t('forgot.sentTitle')}</h1>
          <p className="lead" style={{ fontSize: 16 }}>{t('forgot.sentText', { email: normalizeEmail(email) })}</p>
          <ul className="forgot__tips">
            <li>{t('forgot.tip1')}</li>
            <li>{t('forgot.tip2')}</li>
          </ul>
          <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 20 }} onClick={() => setSent(false)}>{t('forgot.again')}</button>
        </div>
      ) : (
        <>
          <p className="kicker">{t('forgot.kicker')}</p>
          <h1 className="h2">{t('forgot.title')}</h1>
          <p className="lead" style={{ fontSize: 16 }}>{t('forgot.lead')}</p>
          <form className="form" onSubmit={submit} noValidate>
            {error && <div className="alert alert--error" role="alert"><AlertCircle className="ic" aria-hidden="true" />{error}</div>}
            <label className="field">
              <span>{t('auth.email')}</span>
              <span className="field__box">
                <Mail className="ic" aria-hidden="true" />
                <input type="email" inputMode="email" autoComplete="email" required className="input" placeholder="ime@gmail.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} aria-invalid={Boolean(error)} />
              </span>
            </label>
            <button type="submit" disabled={loading} className="btn btn--pink btn--block" style={{ marginTop: 8 }}>
              {loading ? <><Loader2 className="ic animate-spin" aria-hidden="true" />{t('auth.sending')}</> : t('forgot.send')}
            </button>
          </form>
          <p className="auth__alt">{t('forgot.google')} <Link href="/login">{t('nav.login')}</Link></p>
        </>
      )}
    </AuthShell>
  );
}
