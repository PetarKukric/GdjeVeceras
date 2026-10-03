'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, MailCheck, RefreshCw, X } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

/** Bilo koji klijent može otvoriti modal: window.dispatchEvent(new Event(VERIFY_EVENT)) */
export const VERIFY_EVENT = 'gv-verify-required';
const SEEN_KEY = 'gv-verify-modal-seen';

/** Linkovi na najčešće email servise — da korisnik jednim klikom otvori inbox */
function inboxUrl(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'https://mail.google.com/mail/u/0/#inbox';
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) return 'https://outlook.live.com/mail/0/';
  if (domain.startsWith('yahoo.')) return 'https://mail.yahoo.com/';
  if (domain === 'icloud.com' || domain === 'me.com') return 'https://www.icloud.com/mail';
  return null;
}

/** Odgovor API-ja koji traži potvrđen email (requireVerifiedEmail ili { error: 'verify' }) */
async function isVerifyError(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const data = await res.clone().json();
    return data?.code === 'EMAIL_VERIFICATION_REQUIRED' || data?.error === 'verify';
  } catch {
    return false;
  }
}

/**
 * Nepotvrđen email: velika traka ispod headera + modal.
 * Modal se otvara: jednom po sesiji pri dolasku na sajt, i svaki put kad API odbije akciju zbog nepotvrđenog emaila.
 * Kad korisnik potvrdi email u drugom tabu, traka nestaje čim se vrati (provjera pri fokusu).
 */
export function VerifyEmailGate({ email, onVerified }: { email: string; onVerified: () => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inbox = inboxUrl(email);

  const show = useCallback((fromBlockedAction: boolean) => {
    setBlocked(fromBlockedAction);
    setOpen(true);
  }, []);

  // Prvi dolazak u ovoj sesiji → modal
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch { /* bez storage-a samo pokaži */ }
    const id = setTimeout(() => show(false), 600);
    return () => clearTimeout(id);
  }, [show]);

  // Odbijena akcija bilo gdje na sajtu → modal (presrećemo fetch da ne mijenjamo svaku stranicu)
  useEffect(() => {
    const onEvent = () => show(true);
    window.addEventListener(VERIFY_EVENT, onEvent);
    const original = window.fetch;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 403 && await isVerifyError(res)) window.dispatchEvent(new Event(VERIFY_EVENT));
      return res;
    };
    return () => {
      window.removeEventListener(VERIFY_EVENT, onEvent);
      window.fetch = original;
    };
  }, [show]);

  // Potvrdio u drugom tabu / na telefonu → sakrij sve
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/auth/session', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data?.user?.emailVerified) onVerified(); })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); };
  }, [onVerified]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage({ ok: res.ok, text: res.ok ? t('verify.sent') : data.error || t('common.tryLater') });
    } catch {
      setMessage({ ok: false, text: t('common.tryLater') });
    } finally {
      setSending(false);
    }
  };

  const actions = (
    <div className="vgate__actions">
      {inbox && (
        <a className="btn btn--pink" href={inbox} target="_blank" rel="noopener noreferrer"><MailCheck className="ic" aria-hidden="true" />{t('verify.openInbox')}</a>
      )}
      <button type="button" className={`btn ${inbox ? 'btn--ghost' : 'btn--pink'}`} onClick={resend} disabled={sending}>
        {sending ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <RefreshCw className="ic" aria-hidden="true" />}
        {t('verify.resend')}
      </button>
    </div>
  );

  return (
    <>
      <section className="vbar" aria-labelledby="vbar-title">
        <div className="vbar__in">
          <span className="vbar__icon" aria-hidden="true"><Mail /></span>
          <div className="vbar__text">
            <b id="vbar-title">{t('verify.barTitle')}</b>
            <span>{t('verify.barText', { email })}</span>
          </div>
          <button type="button" className="btn btn--pink btn--sm" onClick={() => show(false)}>{t('verify.barCta')}</button>
        </div>
        {message && <p className={`vbar__msg${message.ok ? ' is-ok' : ''}`} role="status">{message.text}</p>}
      </section>

      <dialog ref={dialogRef} className="vgate" aria-labelledby="vgate-title" onClose={() => setOpen(false)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <div className="vgate__card">
          <button type="button" className="vgate__close" onClick={() => setOpen(false)} aria-label={t('common.close')}><X aria-hidden="true" /></button>
          <span className="vgate__icon" aria-hidden="true"><Mail /></span>
          <p className="kicker">{blocked ? t('verify.blockedKicker') : t('verify.kicker')}</p>
          <h2 id="vgate-title" className="h2">{t('verify.title')}</h2>
          <p className="vgate__lead">{t('verify.lead')} <b>{email}</b></p>
          <ol className="vgate__steps">
            <li>{t('verify.step1')}</li>
            <li>{t('verify.step2')}</li>
            <li>{t('verify.step3')}</li>
          </ol>
          <ul className="vgate__locked" aria-label={t('verify.lockedTitle')}>
            {(['points', 'rewards', 'comments', 'photos'] as const).map((k) => <li key={k}><CheckCircle2 aria-hidden="true" />{t(`verify.locked.${k}`)}</li>)}
          </ul>
          {actions}
          {message && <p className={`vgate__msg${message.ok ? ' is-ok' : ''}`} role="status">{message.text}</p>}
          <p className="vgate__fine">{t('verify.spam')}</p>
        </div>
      </dialog>
    </>
  );
}
