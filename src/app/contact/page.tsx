'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { CONTACT_EMAIL } from '@/lib/i18n/pages';

const Instagram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const Facebook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TikTok = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

const TOPICS = ['general', 'partner', 'problem', 'rewards', 'collab'] as const;
type Topic = (typeof TOPICS)[number];

export default function ContactPage() {
  const { t } = useLang();
  const [topic, setTopic] = useState<Topic>('general');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', venueId: '' });
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('topic');
    if (q && (TOPICS as readonly string[]).includes(q)) setTopic(q as Topic);
    fetch('/api/venues').then((r) => (r.ok ? r.json() : [])).then((list) => Array.isArray(list) && setVenues(list.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })))).catch(() => {});
    // Prijavljen korisnik: ime i email se popunjavaju sami
    fetch('/api/auth/session').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.user) setForm((f) => ({ ...f, name: f.name || d.user.name || '', email: f.email || d.user.email || '' }));
    }).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const subject = `[${t(`contactPage.topics.${topic}`)}] ${form.subject}`.slice(0, 150);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, subject }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || t('checkin.errors.server')); return; }
      setDone(true);
      setForm((f) => ({ ...f, subject: '', message: '', venueId: '' }));
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{t('contactPage.kicker')}</p>
            <h1 className="h1">{t('contactPage.title')}</h1>
            <p className="lead">{t('contactPage.lead')}</p>
          </div>
        </div>

        <div className="contact">
          <section className="panel">
            {done ? (
              <div className="ci-done" role="status" style={{ textAlign: 'center' }}>
                <div className="burst"><Check className="ic" aria-hidden="true" /></div>
                <h2 className="h3" style={{ justifyContent: 'center' }}>{t('contactPage.sentTitle')}</h2>
                <p className="ci-note" style={{ marginTop: 8 }}>{t('contactPage.sentText')}</p>
                <button className="btn btn--ghost" style={{ marginTop: 20 }} onClick={() => setDone(false)}>{t('contactPage.another')}</button>
              </div>
            ) : (
              <form className="form" style={{ marginTop: 0 }} onSubmit={submit}>
                <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>{t('contactPage.topic')}</legend>
                  <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 0 }}>
                    {TOPICS.map((tp) => (
                      <button key={tp} type="button" className="chip" aria-pressed={topic === tp} onClick={() => setTopic(tp)}>{t(`contactPage.topics.${tp}`)}</button>
                    ))}
                  </div>
                </fieldset>
                {error && <div className="alert alert--error" role="alert"><AlertCircle className="ic" aria-hidden="true" />{error}</div>}
                <div className="form-2">
                  <label className="field"><span>{t('auth.name')}</span><input className="input" required maxLength={80} autoComplete="name" value={form.name} onChange={set('name')} /></label>
                  <label className="field"><span>{t('auth.email')}</span><input className="input" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={set('email')} /></label>
                </div>
                {(topic === 'problem' || topic === 'rewards' || topic === 'general') && venues.length > 0 && (
                  <label className="field"><span>{t('contactPage.venue')}</span>
                    <select className="input" value={form.venueId} onChange={set('venueId')}>
                      <option value="">{t('contactPage.noVenue')}</option>
                      {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="field"><span>{t('contactPage.subject')}</span><input className="input" required maxLength={120} value={form.subject} onChange={set('subject')} placeholder={t(`contactPage.placeholders.${topic}`)} /></label>
                <label className="field"><span>{t('contactPage.message')}</span><textarea className="input" required minLength={5} maxLength={3000} rows={6} style={{ paddingBlock: 14, resize: 'vertical' }} value={form.message} onChange={set('message')} /></label>
                <button className="btn btn--pink btn--block" disabled={busy}>
                  {busy ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <Send className="ic" aria-hidden="true" />}{t('contactPage.send')}
                </button>
                <p className="ci-note" style={{ fontSize: 13 }}>{t('contactPage.privacy1')} <Link className="pink" href="/privacy">{t('footer.privacy')}</Link>.</p>
              </form>
            )}
          </section>

          <aside className="contact__side">
            <div className="panel">
              <p className="panel__title">{t('contactPage.direct')}</p>
              <div className="dlinks">
                <a href={`mailto:${CONTACT_EMAIL}`}><span className="dlinks__ic"><Mail size={18} /></span><span className="dlinks__label">{CONTACT_EMAIL}</span></a>
                <a href="tel:+38766771086"><span className="dlinks__ic"><Phone size={18} /></span><span className="dlinks__label">+387 66 771 086</span></a>
                <div className="dlinks__row"><span className="dlinks__ic"><MapPin size={18} /></span><span className="dlinks__label">{t('contactPage.location')}</span></div>
              </div>
              <p className="ci-note" style={{ textAlign: 'left', marginTop: 12 }}>{t('contactPage.reply')}</p>
            </div>
            <div className="panel">
              <p className="panel__title">{t('footer.followUs')}</p>
              <div className="footer__social">
                <a href="https://www.instagram.com/gdjeveceras" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram /></a>
                <a href="https://www.tiktok.com/@gdjeveceras2" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTok /></a>
                <a href="https://www.facebook.com/share/1EaMwFTjic/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook /></a>
              </div>
            </div>
            <div className="venue-cta" style={{ marginTop: 0 }}>
              <div>
                <h2 className="h3">{t('partners.ctaTitle')}</h2>
                <p>{t('contactPage.partnerText')}</p>
              </div>
              <button type="button" className="btn btn--white" onClick={() => { setTopic('partner'); setDone(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('partners.ctaBtn')}</button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
