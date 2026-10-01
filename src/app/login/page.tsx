'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { useLang } from '@/components/i18n/LangProvider';
import { AuthShell, GoogleSection, safeNext } from '@/components/auth/AuthShell';

export default function Login() {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [adminPasswordSent, setAdminPasswordSent] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [query, setQuery] = useState('');
  useEffect(() => setQuery(window.location.search), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setRequiresVerification(false);
    setAdminPasswordSent(false);
    setResendMessage('');

    const normalizedEmail = normalizeEmail(formData.email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: normalizedEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        const staff = data.user && (data.user.role === 'ADMIN' || data.user.role === 'OWNER');
        window.location.href = safeNext() || (staff ? '/admin' : '/');
        return;
      }
      if (data.adminPasswordSent) {
        setAdminPasswordSent(true);
      } else if (data.requiresVerification) {
        setRequiresVerification(true);
        setError(data.error);
      } else if (data.error === 'Unesite ispravnu email adresu.') {
        setEmailError(t('auth.invalidEmail'));
      } else {
        setError(data.error || t('auth.wrongCredentials'));
      }
      setLoading(false);
    } catch {
      setError(t('checkin.errors.network'));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setResendMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) setResendMessage(data.message);
      else setError(data.error);
    } catch {
      setError(t('common.tryLater'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell>
      <p className="kicker">{t('auth.welcomeBack')}</p>
      <h1 className="h2">{t('auth.loginTitle')}</h1>
      <p className="lead" style={{ fontSize: 16 }}>{t('auth.loginLead')}</p>
      <GoogleSection t={t} />

      <form onSubmit={handleSubmit} className="form" style={{ marginTop: 0 }} noValidate>
        {error && (
          <div className="alert alert--error" role="alert">
            <AlertCircle className="ic" aria-hidden="true" />
            <div>
              {error}
              {requiresVerification && (
                <div><button type="button" onClick={handleResend} disabled={resending} className="link" style={{ minHeight: 36 }}>{resending ? t('auth.sending') : t('auth.resend')}</button></div>
              )}
            </div>
          </div>
        )}
        {resendMessage && <div className="alert alert--ok" role="status">{resendMessage}</div>}
        {adminPasswordSent && (
          <div className="alert alert--info" role="status">
            <Mail className="ic" aria-hidden="true" />
            <div><b>{t('auth.adminSent')}</b><br />{t('auth.adminSentText')}</div>
          </div>
        )}

        <label className="field">
          <span>{t('auth.email')}</span>
          <span className="field__box">
            <Mail className="ic" aria-hidden="true" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              className="input"
              placeholder="ime@gmail.com"
              aria-invalid={Boolean(emailError)}
              value={formData.email}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (emailError) setEmailError(''); }}
            />
          </span>
          {emailError && <span className="field__err">{emailError}</span>}
        </label>

        <label className="field">
          <span>{t('auth.password')}</span>
          <span className="field__box">
            <Lock className="ic" aria-hidden="true" />
            <input
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </span>
        </label>

        <button type="submit" disabled={loading} className="btn btn--pink btn--block" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 className="ic animate-spin" aria-hidden="true" />{t('auth.loggingIn')}</> : t('auth.loginBtn')}
        </button>
        <Link href="/forgot-password" className="link" style={{ justifyContent: 'center' }}>{t('auth.forgot')}</Link>
      </form>

      <p className="auth__alt">
        {t('auth.noAccount')} <Link href={`/signup${query}`}>{t('nav.signup')}</Link>
      </p>
    </AuthShell>
  );
}
