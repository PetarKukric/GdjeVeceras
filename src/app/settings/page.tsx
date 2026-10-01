'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Check, Globe, KeyRound, Loader2, LogOut, Lock, Mail, MonitorSmartphone, Trash2, User } from 'lucide-react';
import { LangSwitch, useLang } from '@/components/i18n/LangProvider';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';

interface Account {
  name: string | null; email: string; role: string; avatarUrl: string | null; bio: string | null;
  showCheckIns: boolean; emailVerified: boolean; hasGoogle: boolean; createdAt: string;
}

export default function SettingsPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [acc, setAcc] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [resent, setResent] = useState('');

  useEffect(() => {
    fetch('/api/profile').then((r) => (r.ok ? r.json() : null)).then(setAcc).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const confirmWord = t('settings.deleteWord');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 8) { setPwMsg({ ok: false, text: t('auth.passwordShort') }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ ok: false, text: t('settings.pwMismatch') }); return; }
    setPwBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setPw({ current: '', next: '', confirm: '' }); setPwMsg({ ok: true, text: t('settings.pwChanged') }); }
      else setPwMsg({ ok: false, text: data.error || t('checkin.errors.server') });
    } catch { setPwMsg({ ok: false, text: t('checkin.errors.network') }); }
    finally { setPwBusy(false); }
  };

  const togglePrivacy = async (value: boolean) => {
    setPrivacyBusy(true);
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showCheckIns: value }) });
      if (res.ok) { setAcc((a) => (a ? { ...a, showCheckIns: value } : a)); showToast(t('settings.saved')); }
    } finally { setPrivacyBusy(false); }
  };

  const logoutAll = async () => {
    if (!window.confirm(t('settings.logoutAllConfirm'))) return;
    const res = await fetch('/api/auth/logout-all', { method: 'POST' });
    if (res.ok) showToast(t('settings.logoutAllDone'));
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };

  const resend = async () => {
    if (!acc) return;
    const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: acc.email }) });
    const data = await res.json().catch(() => ({}));
    setResent(data.message || data.error || '');
  };

  const deleteAccount = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { window.location.href = '/login'; return; }
      setDeleteError(data.error || t('checkin.errors.server'));
    } catch { setDeleteError(t('checkin.errors.network')); }
    finally { setDeleting(false); }
  };

  if (loading) return <main className="page"><div className="wrap"><div className="skel" style={{ minHeight: 400 }} /></div></main>;
  if (!acc) return null;

  const roleLabel = acc.role === 'ADMIN' ? t('settings.roleAdmin') : acc.role === 'OWNER' ? t('settings.roleOwner') : t('settings.roleUser');

  return (
    <main className="page">
      <div className="wrap settings">
        <div className="page-head">
          <div>
            <p className="kicker">{t('settings.kicker')}</p>
            <h1 className="h1">{t('nav.settings')}</h1>
          </div>
        </div>

        <nav className="settings__nav" aria-label={t('info.toc')}>
          {[['nalog', t('settings.account')], ['privatnost', t('settings.privacy')], ['sigurnost', t('settings.security')], ['jezik', t('common.language')], ['brisanje', t('settings.danger')]].map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>

        <div className="settings__body">
          <section id="nalog" className="panel">
            <p className="panel__title"><span><User size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('settings.account')}</span></p>
            <div className="who">
              <Avatar name={acc.name} url={acc.avatarUrl} className="avatar avatar--lg" />
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 18, display: 'block', overflowWrap: 'anywhere' }}>{acc.name}</b>
                <p style={{ margin: '2px 0 0', overflowWrap: 'anywhere' }}><Mail size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />{acc.email}</p>
                <p style={{ margin: '2px 0 0' }}>{roleLabel}{acc.hasGoogle ? ` · ${t('settings.googleLinked')}` : ''}</p>
              </div>
            </div>
            {!acc.emailVerified && (
              <div className="alert alert--info" style={{ marginTop: 16 }}>
                <AlertCircle className="ic" aria-hidden="true" />
                <div>{t('auth.verifyBar')} <button className="link" style={{ minHeight: 0 }} onClick={resend}>{t('auth.resend')}</button>{resent && <div>{resent}</div>}</div>
              </div>
            )}
            <div className="settings__row">
              <Link className="btn btn--ghost btn--sm" href="/profile">{t('settings.editProfile')}</Link>
              <button className="btn btn--ghost btn--sm" onClick={logout}><LogOut className="ic" aria-hidden="true" />{t('nav.logout')}</button>
            </div>
          </section>

          <section id="privatnost" className="panel">
            <p className="panel__title"><span><Lock size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('settings.privacy')}</span></p>
            <label className="toggle">
              <input type="checkbox" checked={acc.showCheckIns} disabled={privacyBusy} onChange={(e) => togglePrivacy(e.target.checked)} />
              <span className="toggle__track"><span className="toggle__thumb" /></span>
              <span className="toggle__text">{t('profile.showCheckIns')}</span>
            </label>
            <p className="ci-note" style={{ textAlign: 'left', margin: '8px 0 0' }}>{acc.showCheckIns ? t('settings.checkinsPublic') : t('profile.privateNote')}</p>
            <p className="ci-note" style={{ textAlign: 'left', margin: '12px 0 0' }}>{t('settings.locationNote')} <Link className="pink" href="/privacy">{t('footer.privacy')}</Link></p>
          </section>

          <section id="sigurnost" className="panel">
            <p className="panel__title"><span><KeyRound size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('settings.security')}</span></p>
            {acc.role === 'ADMIN' ? (
              <p className="ci-note" style={{ textAlign: 'left', margin: 0 }}>{t('settings.adminOtp')}</p>
            ) : (
              <form className="form" style={{ marginTop: 0 }} onSubmit={changePassword}>
                {acc.hasGoogle && <p className="ci-note" style={{ textAlign: 'left', margin: 0 }}>{t('settings.googlePw')} <Link className="pink" href="/forgot-password">{t('auth.forgot')}</Link></p>}
                {pwMsg && <div className={`alert ${pwMsg.ok ? 'alert--ok' : 'alert--error'}`} role="status">{pwMsg.ok ? <Check className="ic" aria-hidden="true" /> : <AlertCircle className="ic" aria-hidden="true" />}{pwMsg.text}</div>}
                <label className="field"><span>{t('settings.pwCurrent')}</span><input className="input" type="password" autoComplete="current-password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
                <div className="form-2">
                  <label className="field"><span>{t('settings.pwNew')}</span><input className="input" type="password" autoComplete="new-password" minLength={8} required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
                  <label className="field"><span>{t('settings.pwConfirm')}</span><input className="input" type="password" autoComplete="new-password" minLength={8} required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></label>
                </div>
                <button className="btn btn--pink" disabled={pwBusy} style={{ justifySelf: 'start' }}>{pwBusy ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <KeyRound className="ic" aria-hidden="true" />}{t('settings.pwSave')}</button>
                <p className="ci-note" style={{ textAlign: 'left', margin: 0, fontSize: 13 }}>{t('settings.pwNote')}</p>
              </form>
            )}
            <div className="settings__row" style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 18 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MonitorSmartphone size={16} aria-hidden="true" />{t('settings.logoutAll')}</b>
                <p className="ci-note" style={{ textAlign: 'left', margin: '4px 0 0', fontSize: 13 }}>{t('settings.logoutAllText')}</p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={logoutAll}>{t('settings.logoutAllBtn')}</button>
            </div>
          </section>

          <section id="jezik" className="panel">
            <div className="panel__title"><span><Globe size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('common.language')}</span><LangSwitch /></div>
            <p className="ci-note" style={{ textAlign: 'left', margin: 0 }}>{t('settings.langNote')}</p>
          </section>

          <section id="brisanje" className="panel settings__danger">
            <p className="panel__title"><span><AlertTriangle size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('settings.danger')}</span></p>
            <p style={{ margin: 0, color: 'var(--text)' }}>{t('settings.deleteText')}</p>
            {acc.role === 'OWNER' && <p className="ci-note" style={{ textAlign: 'left', margin: '8px 0 0' }}>{t('settings.ownerDelete')}</p>}
            <label className="field" style={{ marginTop: 16 }}>
              <span>{t('settings.deleteType', { word: confirmWord })}</span>
              <input className="input" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
            </label>
            {deleteError && <div className="alert alert--error" style={{ marginTop: 12 }}><AlertCircle className="ic" aria-hidden="true" />{deleteError}</div>}
            <button className="btn btn--danger" style={{ marginTop: 14 }} disabled={deleting || deleteText.trim().toUpperCase() !== confirmWord.toUpperCase()} onClick={deleteAccount}>
              {deleting ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <Trash2 className="ic" aria-hidden="true" />}{t('settings.deleteBtn')}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
