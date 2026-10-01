'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, ImagePlus, Loader2, Lock, Pencil, Trash2, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { SCORE_EVENT } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';

export interface ProfilePhoto {
  id: string; url: string; caption: string | null; createdAt: string;
  venue: { name: string; slug: string } | null;
}

function useErrorText() {
  const { t } = useLang();
  return (code: string) => {
    const key = `profile.errors.${code}`;
    const text = t(key);
    return text === key ? t('checkin.errors.server') : text;
  };
}

/** Avatar + ime + bio + privatnost — na vlastitom profilu sve je izmjenjivo */
export function ProfileIdentity({ user, editable, since, counts, children }: {
  user: { id: string; name: string | null; bio: string | null; avatarUrl: string | null; showCheckIns: boolean };
  editable: boolean;
  since: string;
  counts: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useLang();
  const errorText = useErrorText();
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [showCheckIns, setShowCheckIns] = useState(user.showCheckIns);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy('avatar'); setError('');
    const form = new FormData();
    form.append('photo', file);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setError(errorText(data.error)); return; }
      setAvatar(data.avatarUrl);
      window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail: { avatarUrl: data.avatarUrl } }));
    } catch { setError(t('checkin.errors.network')); }
    finally { setBusy(''); }
  };

  const save = async (patch: Record<string, unknown>) => {
    setBusy('save'); setError('');
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const data = await res.json();
      if (!res.ok) { setError(errorText(data.error)); return false; }
      setName(data.name || ''); setBio(data.bio || ''); setShowCheckIns(data.showCheckIns);
      return true;
    } catch { setError(t('checkin.errors.network')); return false; }
    finally { setBusy(''); }
  };

  return (
    <div className="panel pid">
      <div className="pid__top">
        <div className="pid__avatar">
          <Avatar name={name} url={avatar} className="avatar avatar--xl" />
          {editable && (
            <label className="pid__cam" aria-label={t('profile.changePhoto')} title={t('profile.changePhoto')}>
              {busy === 'avatar' ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <Camera className="ic" aria-hidden="true" />}
              <input type="file" accept="image/*" onChange={uploadAvatar} disabled={busy === 'avatar'} />
            </label>
          )}
        </div>
        {!editing ? (
          <div className="pid__text">
            <h1>{name}</h1>
            {bio ? <p className="pid__bio">{bio}</p> : editable ? <p className="pid__bio pid__bio--empty">{t('profile.bioEmpty')}</p> : null}
            <p className="pid__since">{since}</p>
          </div>
        ) : (
          <form className="pid__form" onSubmit={async (e) => { e.preventDefault(); if (await save({ name, bio })) setEditing(false); }}>
            <label className="field"><span>{t('auth.name')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
            </label>
            <label className="field"><span>{t('profile.bio')}</span>
              <textarea className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder={t('profile.bioPlaceholder')} style={{ paddingBlock: 12, resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--pink btn--sm" disabled={busy === 'save'}>{busy === 'save' && <Loader2 className="ic animate-spin" aria-hidden="true" />}{t('profile.save')}</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setName(user.name || ''); setBio(user.bio || ''); }}>{t('profile.cancel')}</button>
            </div>
          </form>
        )}
      </div>
      {error && <div className="alert alert--error" role="alert" style={{ marginTop: 14 }}><AlertCircle className="ic" aria-hidden="true" />{error}</div>}
      <div className="who__counts">{counts}</div>
      {children}
      {editable && !editing && (
        <div className="pid__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}><Pencil className="ic" aria-hidden="true" />{t('profile.edit')}</button>
          <label className="toggle">
            <input type="checkbox" checked={showCheckIns} disabled={busy === 'save'} onChange={(e) => save({ showCheckIns: e.target.checked })} />
            <span className="toggle__track"><span className="toggle__thumb" /></span>
            <span className="toggle__text">{t('profile.showCheckIns')}</span>
          </label>
          {!showCheckIns && <p className="pid__private"><Lock size={14} aria-hidden="true" /> {t('profile.privateNote')}</p>}
        </div>
      )}
    </div>
  );
}

/** Galerija fotki iz izlazaka (upload + brisanje na vlastitom profilu, pregled preko cijelog ekrana) */
export function PhotoGallery({ initial, editable, ownerName }: { initial: ProfilePhoto[]; editable: boolean; ownerName: string }) {
  const { t } = useLang();
  const errorText = useErrorText();
  const [photos, setPhotos] = useState(initial);
  const [open, setOpen] = useState<number | null>(null);
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pending || venues.length) return;
    fetch('/api/venues').then((r) => (r.ok ? r.json() : [])).then((list) => setVenues(Array.isArray(list) ? list.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })) : [])).catch(() => {});
  }, [pending, venues.length]);

  useEffect(() => {
    if (open === null) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [open, photos.length]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending({ file, preview: URL.createObjectURL(file) });
    setError('');
  };

  const upload = async () => {
    if (!pending) return;
    setBusy(true); setError('');
    const form = new FormData();
    form.append('photo', pending.file);
    form.append('caption', caption);
    if (venueId) form.append('venueId', venueId);
    try {
      const res = await fetch('/api/profile/photos', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setError(errorText(data.error)); return; }
      setPhotos((prev) => [data, ...prev]);
      URL.revokeObjectURL(pending.preview);
      setPending(null); setCaption(''); setVenueId('');
    } catch { setError(t('checkin.errors.network')); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm(t('profile.deletePhotoConfirm'))) return;
    const res = await fetch(`/api/profile/photos?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) { setPhotos((prev) => prev.filter((p) => p.id !== id)); setOpen(null); }
  };

  const current = open !== null ? photos[open] : null;

  return (
    <>
      {editable && (
        pending ? (
          <div className="pg-new">
            <img src={pending.preview} alt={t('checkin.photoPreview')} />
            <div className="pg-new__form">
              <label className="field"><span>{t('profile.caption')}</span>
                <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder={t('profile.captionPlaceholder')} />
              </label>
              <label className="field"><span>{t('profile.whereWasIt')}</span>
                <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                  <option value="">—</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn--pink btn--sm" onClick={upload} disabled={busy}>{busy && <Loader2 className="ic animate-spin" aria-hidden="true" />}{t('profile.addPhoto')}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => { URL.revokeObjectURL(pending.preview); setPending(null); }}>{t('profile.cancel')}</button>
              </div>
            </div>
          </div>
        ) : null
      )}
      {error && <div className="alert alert--error" role="alert" style={{ marginBottom: 12 }}><AlertCircle className="ic" aria-hidden="true" />{error}</div>}

      {photos.length === 0 && !editable ? (
        <p className="ci-note" style={{ margin: 0, textAlign: 'left' }}>{t('profile.noPhotosOther', { name: ownerName })}</p>
      ) : (
        <div className="pg">
          {editable && !pending && (
            <label className="pg__add">
              <ImagePlus className="ic" aria-hidden="true" />
              <span>{t('profile.addPhoto')}</span>
              <input type="file" accept="image/*" onChange={pick} />
            </label>
          )}
          {photos.map((p, i) => (
            <button key={p.id} type="button" className="pg__item" onClick={() => setOpen(i)} aria-label={p.caption || t('profile.openPhoto')}>
              <img src={p.url} alt="" loading="lazy" />
              {p.venue && <span className="pg__tag">{p.venue.name}</span>}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={current.caption || t('profile.openPhoto')} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <button ref={closeRef} className="lightbox__btn lightbox__close" onClick={() => setOpen(null)} aria-label={t('profile.close')}><X className="ic" aria-hidden="true" /></button>
          {photos.length > 1 && <>
            <button className="lightbox__btn lightbox__prev" onClick={() => setOpen((open! - 1 + photos.length) % photos.length)} aria-label={t('profile.prev')}><ChevronLeft className="ic" aria-hidden="true" /></button>
            <button className="lightbox__btn lightbox__next" onClick={() => setOpen((open! + 1) % photos.length)} aria-label={t('profile.next')}><ChevronRight className="ic" aria-hidden="true" /></button>
          </>}
          <figure>
            <img src={current.url} alt={current.caption || ''} />
            <figcaption>
              <span>
                {current.caption}
                {current.venue && <> · <Link href={`/venues/${current.venue.slug}`}>{current.venue.name}</Link></>}
              </span>
              {editable && <button className="link" onClick={() => remove(current.id)}><Trash2 size={16} aria-hidden="true" />{t('profile.deletePhoto')}</button>}
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
