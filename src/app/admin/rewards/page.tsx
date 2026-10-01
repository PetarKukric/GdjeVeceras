'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { RewardKindIcon } from '@/components/score/ScoreParts';
import { PosterArt } from '@/components/ui/PosterArt';
import { CheckCircle2, Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2, XCircle } from 'lucide-react';

interface AdminReward {
  id: string; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null;
  kind: string; cost: number; stock: number | null; active: boolean; imageUrl: string | null;
  venue: { id: string; name: string } | null; _count: { redemptions: number };
}
interface VenueOption { id: string; name: string }
interface CheckedCode {
  code: string; status: string; createdAt: string; usedAt: string | null;
  user: { name: string | null }; reward: { title: string; venue: { name: string } | null };
}

const KIND_LABEL: Record<string, string> = { DRINK: 'Piće', ENTRY: 'Ulaz', MERCH: 'GV merch', OTHER: 'Ostalo' };
const EMPTY_FORM = { title: '', titleEn: '', description: '', descriptionEn: '', kind: 'DRINK', cost: '500', stock: '', venueId: '', imageUrl: '' };

export default function AdminRewards() {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState<CheckedCode | null>(null);
  const [codeMsg, setCodeMsg] = useState('');

  const load = async () => {
    const [r, v, s] = await Promise.all([fetch('/api/admin/rewards'), fetch('/api/admin/checkin'), fetch('/api/auth/session')]);
    if (r.ok) setRewards(await r.json());
    if (v.ok) setVenues((await v.json()).map((x: VenueOption) => ({ id: x.id, name: x.name })));
    if (s.ok) setRole((await s.json()).user.role);
  };
  useEffect(() => { load(); }, []);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const startEdit = (r: AdminReward) => {
    setEditingId(r.id);
    setError('');
    setForm({
      title: r.title, titleEn: r.titleEn || '', description: r.description || '', descriptionEn: r.descriptionEn || '',
      kind: r.kind, cost: String(r.cost), stock: r.stock === null ? '' : String(r.stock), venueId: r.venue?.id || '', imageUrl: r.imageUrl || '',
    });
    document.getElementById('forma')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/rewards', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Greška.'); return; }
      cancelEdit();
      load();
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/rewards', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
    if (res.ok) load();
  };

  const remove = async (r: AdminReward) => {
    const msg = r._count.redemptions > 0
      ? `„${r.title}" već ima ${r._count.redemptions} izdatih kodova — biće sakrivena (kodovi i dalje važe). Nastaviti?`
      : `Obrisati nagradu „${r.title}"?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/admin/rewards?id=${r.id}`, { method: 'DELETE' });
    if (res.ok) { if (editingId === r.id) cancelEdit(); load(); }
  };

  const checkCode = async (use = false) => {
    setCodeMsg('');
    const res = await fetch('/api/admin/redemptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, use }) });
    const data = await res.json();
    if (!res.ok) { setChecked(null); setCodeMsg(data.error || 'Greška.'); return; }
    setChecked(data);
    if (use) setCodeMsg('Iskorišteno ✓ — izdaj nagradu gostu.');
  };

  return (
    <>
      <AdminHeader title="Nagrade i kodovi" />
      <main className="adm-main">
        <section id="provjera" className="adm-card adm-card--pad">
          <div className="adm-card__head" style={{ padding: 0, border: 0, marginBottom: 12 }}><h2>Provjeri kod gosta</h2></div>
          <p className="adm-hint">Gost pokaže kod (npr. GV-AB12-CD34) sa svog telefona. Provjeri ga i označi kao iskorišten kad izdaš nagradu — svaki kod važi samo jednom.</p>
          <form className="adm-row" onSubmit={(e) => { e.preventDefault(); checkCode(false); }}>
            <input className="input adm-code" placeholder="GV-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Kod nagrade" />
            <button className="btn btn--ghost btn--sm" type="submit"><Search className="ic" aria-hidden="true" />Provjeri</button>
          </form>
          {codeMsg && <p className="adm-hint" style={{ color: 'var(--text)', fontWeight: 700, marginTop: 12 }}>{codeMsg}</p>}
          {checked && (
            <div className={`alert ${checked.status === 'ACTIVE' ? 'alert--ok' : 'alert--error'}`} style={{ marginTop: 12 }}>
              {checked.status === 'ACTIVE' ? <CheckCircle2 className="ic" aria-hidden="true" /> : <XCircle className="ic" aria-hidden="true" />}
              <div>
                <b>{checked.reward.title}</b> · {checked.reward.venue?.name || 'GdjeVečeras merch'}<br />
                Gost: {checked.user.name || '—'} · {checked.status === 'ACTIVE' ? 'Važeći' : checked.status === 'USED' ? `Iskorišten ${checked.usedAt ? new Date(checked.usedAt).toLocaleString('sr-Latn-BA') : ''}` : 'Otkazan'}
                {checked.status === 'ACTIVE' && <div style={{ marginTop: 10 }}><button onClick={() => checkCode(true)} className="btn btn--pink btn--sm">Označi kao iskorišteno</button></div>}
              </div>
            </div>
          )}
        </section>

        <section id="forma" className="adm-card adm-card--pad" style={{ scrollMarginTop: 80 }}>
          <div className="adm-card__head" style={{ padding: 0, border: 0, marginBottom: 12 }}>
            <h2>{editingId ? 'Uredi nagradu' : 'Nova nagrada'}</h2>
            {editingId && <button className="link" style={{ minHeight: 0 }} onClick={cancelEdit}>Odustani</button>}
          </div>
          <p className="adm-hint">Nagrade vide svi korisnici na stranici <b>/rewards</b>. {role === 'ADMIN' ? 'Nagrada bez lokala je GdjeVečeras merch (upaljač, majica, patike…) — izdaje je vaš tim.' : 'Nagrade tvog lokala izdaje tvoje osoblje na šanku.'}</p>
          {error && <div className="alert alert--error" style={{ marginBottom: 12 }}>{error}</div>}
          <form onSubmit={submit} className="adm-form">
            <label className="field"><span>Naziv *</span><input className="input" placeholder="npr. Besplatan shot" value={form.title} onChange={set('title')} required maxLength={80} /></label>
            <label className="field"><span>Naziv na engleskom</span><input className="input" placeholder="npr. Free shot" value={form.titleEn} onChange={set('titleEn')} maxLength={80} /></label>
            <label className="field"><span>Opis</span><textarea className="input" rows={2} style={{ paddingBlock: 12 }} value={form.description} onChange={set('description')} maxLength={300} /></label>
            <label className="field"><span>Opis na engleskom</span><textarea className="input" rows={2} style={{ paddingBlock: 12 }} value={form.descriptionEn} onChange={set('descriptionEn')} maxLength={300} /></label>
            <label className="field"><span>Ko izdaje nagradu</span>
              <select className="input" value={form.venueId} onChange={set('venueId')} disabled={Boolean(editingId)}>
                {role === 'ADMIN' ? <option value="">GdjeVečeras merch (bez lokala)</option> : <option value="">Izaberi lokal…</option>}
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Vrsta</span>
              <select className="input" value={form.kind} onChange={set('kind')}>
                {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label className="field"><span>Cijena u bodovima *</span><input className="input" type="number" min={10} max={100000} step={10} value={form.cost} onChange={set('cost')} required /></label>
            <label className="field"><span>Zaliha (prazno = neograničeno)</span><input className="input" type="number" min={0} placeholder="∞" value={form.stock} onChange={set('stock')} /></label>
            <div className="adm-form__wide">
              <ImageUploader value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} label="Slika nagrade (opciono)" />
            </div>
            <button type="submit" className="btn btn--pink adm-form__wide" disabled={saving}>
              {saving ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : editingId ? <Pencil className="ic" aria-hidden="true" /> : <Plus className="ic" aria-hidden="true" />}
              {editingId ? 'Sačuvaj izmjene' : 'Dodaj nagradu'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="adm-h2">Sve nagrade <span className="pg__count">{rewards.length}</span></h2>
          {rewards.length === 0 && <p className="adm-hint">Još nema nagrada.</p>}
          <div className="adm-rewards">
            {rewards.map((r) => (
              <article key={r.id} className={`adm-reward${r.active ? '' : ' is-off'}${editingId === r.id ? ' is-editing' : ''}`}>
                <div className="adm-reward__img">
                  {r.imageUrl ? <img src={r.imageUrl} alt="" loading="lazy" /> : <PosterArt seed={r.id} className="event__art" />}
                  <RewardKindIcon kind={r.kind} />
                  {!r.active && <span className="adm-pill">Sakriveno</span>}
                </div>
                <div className="adm-reward__body">
                  <b>{r.title}</b>
                  <small>{r.venue?.name || 'GdjeVečeras merch'} · {KIND_LABEL[r.kind] || r.kind}</small>
                  <div className="adm-reward__meta">
                    <span className="pts"><span>{r.cost.toLocaleString('sr-Latn-BA')} bod.</span></span>
                    <span>{r.stock === null ? 'Zaliha: ∞' : `Zaliha: ${r.stock}`}</span>
                    <span>{r._count.redemptions} zamjena</span>
                  </div>
                </div>
                <div className="adm-reward__actions">
                  <button onClick={() => startEdit(r)} aria-label={`Uredi ${r.title}`}><Pencil size={16} />Uredi</button>
                  <button onClick={() => update(r.id, { active: !r.active })}>{r.active ? <><EyeOff size={16} />Sakrij</> : <><Eye size={16} />Prikaži</>}</button>
                  <button onClick={() => remove(r)} className="is-danger" aria-label={`Obriši ${r.title}`}><Trash2 size={16} />Obriši</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
