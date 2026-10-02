'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Mail, User, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { GUEST_REASONS, type GuestReason } from '@/lib/guest';
import { isValidEmail, normalizeEmail } from '@/lib/validation';
import { useLang } from '@/components/i18n/LangProvider';
import { AuthShell, GoogleSection, safeNext } from '@/components/auth/AuthShell';

export default function Signup() {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState<GuestReason | null>(null);
  useEffect(() => {
    setQuery(window.location.search);
    const r = new URLSearchParams(window.location.search).get('reason');
    if (r && (GUEST_REASONS as readonly string[]).includes(r)) setReason(r as GuestReason);
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '', // honeypot — skriveno polje protiv botova (ljudi ga nikad ne popune)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    const normalizedEmail = normalizeEmail(formData.email);
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }
    if (formData.password.length < 8) {
      setError(t('auth.passwordShort'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: normalizedEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = safeNext() || '/profile';
        return;
      }
      if (data.error === 'Email je već registrovan.') setEmailError(t('auth.emailTaken'));
      else if (data.error === 'Unesite ispravnu email adresu.' || data.error === 'Email adresa nije validna ili domena ne prima email.') setEmailError(data.error);
      else setError(data.error || t('checkin.errors.server'));
      setLoading(false);
    } catch (err) {
      console.error('Signup error:', err);
      setError(t('checkin.errors.network'));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {reason && (
        <div className="auth__reason" role="status">
          <Sparkles className="ic" aria-hidden="true" />
          <div><b>{t(`auth.reason.${reason}.title`)}</b><span>{t(`auth.reason.${reason}.text`)}</span></div>
        </div>
      )}
      <p className="kicker">{t('auth.signupKicker')}</p>
      <h1 className="h2">{t('auth.signupTitle')}</h1>
      <p className="lead" style={{ fontSize: 16 }}>{t('auth.signupLead')}</p>
      <GoogleSection t={t} />

      <form onSubmit={handleSubmit} className="form" style={{ marginTop: 0 }} noValidate>
        {error && <div className="alert alert--error" role="alert"><AlertCircle className="ic" aria-hidden="true" />{error}</div>}

        <label className="field">
          <span>{t('auth.name')}</span>
          <span className="field__box">
            <User className="ic" aria-hidden="true" />
            <input type="text" autoComplete="name" required className="input" placeholder="Marko Marković"
              value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </span>
        </label>

        <label className="field">
          <span>{t('auth.email')}</span>
          <span className="field__box">
            <Mail className="ic" aria-hidden="true" />
            <input type="email" inputMode="email" autoComplete="email" required className="input" placeholder="ime@gmail.com"
              aria-invalid={Boolean(emailError)}
              value={formData.email}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (emailError) setEmailError(''); }} />
          </span>
          {emailError && <span className="field__err">{emailError}</span>}
        </label>

        <label className="field">
          <span>{t('auth.password')}</span>
          <span className="field__box">
            <Lock className="ic" aria-hidden="true" />
            <input type="password" autoComplete="new-password" required minLength={8} className="input" placeholder={t('auth.passwordHint')}
              value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </span>
        </label>

        {/* Honeypot: skriveno polje za botove — ne dirati */}
        <input
          type="text"
          name="company"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, opacity: 0 }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <button type="submit" disabled={loading} className="btn btn--pink btn--block" style={{ marginTop: 8 }}>
          {loading ? <><Loader2 className="ic animate-spin" aria-hidden="true" />{t('auth.signingUp')}</> : t('auth.signupBtn')}
        </button>
        <p className="ci-note" style={{ fontSize: 13, textAlign: 'center' }}>
          {t('auth.terms1')} <Link href="/terms" className="pink">{t('footer.terms')}</Link> {t('auth.terms2')} <Link href="/privacy" className="pink">{t('footer.privacy')}</Link>.
        </p>
      </form>

      <p className="auth__alt">
        {t('auth.haveAccount')} <Link href={`/login${query}`}>{t('nav.login')}</Link>
      </p>
    </AuthShell>
  );
}
