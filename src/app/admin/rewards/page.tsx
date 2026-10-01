'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { RewardKindIcon } from '@/components/score/ScoreParts';
import { PosterArt } from '@/components/ui/PosterArt';
import { Avatar } from '@/components/ui/Avatar';
import { PROVIDER_LABEL, rewardIssuer } from '@/lib/reward-labels';
import { monthKey } from '@/lib/score';
import { CheckCircle2, Crown, Eye, EyeOff, Gift, Loader2, Pencil, Plus, Search, Send, Trash2, XCircle } from 'lucide-react';

interface AdminReward {
  id: string; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null;
  kind: string; cost: number; stock: number | null; active: boolean; imageUrl: string | null;
  type: string; topRank: number | null; month: string | null; provider: string | null;
  venue: { id: string; name: string } | null; _count: { redemptions: number };
  awards: { user: { id: string; name: string | null } }[];
}
interface VenueOption { id: string; name: string }
interface CheckedCode {
  code: string; status: string; createdAt: string; usedAt: string | null;
  user: { name: string | null }; reward: { title: string; venue: { name: string } | null };
}
interface Standing { rank: number; userId: string; points: number; name: string; avatarUrl: string | null }

const KIND_LABEL: Record<string, string> = { DRINK: 'Piće', ENTRY: 'Ulaz', MERCH: 'Merch', OTHER: 'Ostalo' };
const EMPTY_FORM = {
  type: 'REDEEM', title: '', titleEn: '', description: '', descriptionEn: '', kind: 'DRINK', cost: '100', stock: '',
  issuer: 'GV', imageUrl: '', topRank: '1', month: monthKey(),
};
/** "issuer" u formi: GV / PANTHER_TIKE (provajder) ili venue:<id> (lokal) */
const issuerToBody = (issuer: string) => issuer.startsWith('venue:') ? { venueId: issuer.slice(6) } : { venueId: '', provider: issuer };

function nextMonths(n: number): string[] {
  const out: string[] = [];
  let [y, m] = monthKey().split('-').map(Number);
  for (let i = 0; i < n; i++) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
const monthLabel = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString('sr-Latn-BA', { month: 'long', year: 'numeric' });

export default function AdminRewards() {
  const [rewards, setRewards] = useState<AdminReward[]>([]);
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [role, setRole] = useState('');
  const [tab, setTab] = useState<'REDEEM' | 'TOP'>('REDEEM');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [checked, setChecked] = useState<CheckedCode | null>(null);
  const [codeMsg, setCodeMsg] = useState('');
  const [standings, setStandings] = useState<{ current: string; previous: string; standings: Standing[]; lastMonth: Standing[] } | null>(null);
  const [awardMsg, setAwardMsg] = useState('');
  const isAdmin = role === 'ADMIN';

  const load = async () => {
    const [r, v, s] = await Promise.all([fetch('/api/admin/rewards'), fetch('/api/admin/checkin'), fetch('/api/auth/session')]);
    if (r.ok) setRewards(await r.json());
    if (v.ok) setVenues((await v.json()).map((x: VenueOption) => ({ id: x.id, name: x.name })));
    if (s.ok) {
      const user = (await s.json()).user;
      setRole(user.role);
      if (user.role === 'ADMIN') {
        const st = await fetch('/api/admin/rewards/award');
        if (st.ok) setStandings(await st.json());
      } else setForm((f) => ({ ...f, issuer: '' }));
    }
  };
  useEffect(() => { load(); }, []);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  const startEdit = (r: AdminReward) => {
    setEditingId(r.id);
    setTab(r.type === 'TOP' ? 'TOP' : 'REDEEM');
    setError('');
    setForm({
      type: r.type, title: r.title, titleEn: r.titleEn || '', description: r.description || '', descriptionEn: r.descriptionEn || '',
      kind: r.kind, cost: String(r.cost), stock: r.stock === null ? '' : String(r.stock),
      issuer: r.venue ? `venue:${r.venue.id}` : r.provider || 'GV', imageUrl: r.imageUrl || '',
      topRank: String(r.topRank || 1), month: r.month || monthKey(),
    });
    document.getElementById('forma')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cancelEdit = () => { setEditingId(null); setForm({ ...EMPTY_FORM, type: tab, issuer: isAdmin ? 'GV' : '' }); setError(''); };
  const switchTab = (next: 'REDEEM' | 'TOP') => { setTab(next); setEditingId(null); setError(''); setForm({ ...EMPTY_FORM, type: next, issuer: isAdmin ? 'GV' : '' }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.issuer) { setError('Izaberi ko izdaje nagradu.'); return; }
    setSaving(true);
    try {
      const { issuer, ...rest } = form;
      const body = { ...rest, type: tab, ...issuerToBody(issuer) };
      const res = await fetch('/api/admin/rewards', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
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

  const awardNow = async () => {
    if (!standings || !confirm(`Dodijeliti nagrade za ${monthLabel(standings.previous)} top 5 korisnicima? Svaka se dodjeljuje samo jednom.`)) return;
    const res = await fetch('/api/admin/rewards/award', { method: 'POST' });
    const data = await res.json();
    setAwardMsg(res.ok ? (data.awarded?.length ? `Dodijeljeno ${data.awarded.length} nagrada za ${monthLabel(data.month)}.` : 'Nema novih nagrada za dodjelu (već dodijeljeno ili nema postavljenih nagrada).') : data.error || 'Greška.');
    load();
  };

  const redeemList = useMemo(() => rewards.filter((r) => r.type !== 'TOP'), [rewards]);
  const topByMonth = useMemo(() => {
    const map = new Map<string, AdminReward[]>();
    rewards.filter((r) => r.type === 'TOP').forEach((r) => { const k = r.month || '?'; map.set(k, [...(map.get(k) || []), r]); });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rewards]);

  const issuerSelect = (
    <label className="field"><span>Ko izdaje nagradu</span>
      <select className="input" value={form.issuer} onChange={set('issuer')} disabled={Boolean(editingId) && form.issuer.startsWith('venue:')}>
        {isAdmin ? (
          <optgroup label="Partneri (bez lokala)">
            {Object.entries(PROVIDER_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </optgroup>
        ) : <option value="">Izaberi lokal…</option>}
        <optgroup label="Lokal">
          {venues.map((v) => <option key={v.id} value={`venue:${v.id}`}>{v.name}</option>)}
        </optgroup>
      </select>
    </label>
  );

  return (
    <>
      <AdminHeader title="Nagrade i kodovi" />
      <main className="adm-main">
        <section id="provjera" className="adm-card adm-card--pad">
          <div className="adm-card__head" style={{ padding: 0, border: 0, marginBottom: 12 }}><h2>Provjeri kod gosta</h2></div>
          <p className="adm-hint">Gost pokaže kod (npr. GV-AB12-CD34). Provjeri ga i označi kao iskorišten kad izdaš nagradu — svaki kod važi samo jednom.</p>
          <form className="adm-row" onSubmit={(e) => { e.preventDefault(); checkCode(false); }}>
            <input className="input adm-code" placeholder="GV-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Kod nagrade" />
            <button className="btn btn--ghost btn--sm" type="submit"><Search className="ic" aria-hidden="true" />Provjeri</button>
          </form>
          {codeMsg && <p className="adm-hint" style={{ color: 'var(--text)', fontWeight: 700, marginTop: 12 }}>{codeMsg}</p>}
          {checked && (
            <div className={`alert ${checked.status === 'ACTIVE' ? 'alert--ok' : 'alert--error'}`} style={{ marginTop: 12 }}>
              {checked.status === 'ACTIVE' ? <CheckCircle2 className="ic" aria-hidden="true" /> : <XCircle className="ic" aria-hidden="true" />}
              <div>
                <b>{checked.reward.title}</b> · {checked.reward.venue?.name || 'Partner nagrada'}<br />
                Gost: {checked.user.name || '—'} · {checked.status === 'ACTIVE' ? 'Važeći' : checked.status === 'USED' ? `Iskorišten ${checked.usedAt ? new Date(checked.usedAt).toLocaleString('sr-Latn-BA') : ''}` : 'Otkazan'}
                {checked.status === 'ACTIVE' && <div style={{ marginTop: 10 }}><button onClick={() => checkCode(true)} className="btn btn--pink btn--sm">Označi kao iskorišteno</button></div>}
              </div>
            </div>
          )}
        </section>

        <div className="seg" style={{ marginTop: 0 }} role="tablist" aria-label="Vrsta nagrada">
          <button type="button" className="seg__btn" aria-pressed={tab === 'REDEEM'} onClick={() => switchTab('REDEEM')}><Gift size={15} aria-hidden="true" />&nbsp;Za bodove</button>
          {isAdmin && <button type="button" className="seg__btn" aria-pressed={tab === 'TOP'} onClick={() => switchTab('TOP')}><Crown size={15} aria-hidden="true" />&nbsp;Top 5 mjeseca</button>}
        </div>

        {tab === 'TOP' && standings && (
          <section className="adm-cols">
            <div className="adm-card">
              <div className="adm-card__head"><h2>Poredak — {monthLabel(standings.current)}</h2></div>
              <ol className="adm-list">
                {standings.standings.length === 0 && <li className="adm-list__empty">Još nema bodova ovog mjeseca.</li>}
                {standings.standings.map((s) => (
                  <li key={s.userId}><div><span className="top5__rank" style={{ width: 28 }}>{s.rank}</span><Avatar name={s.name} url={s.avatarUrl} className="row__av" /><span className="adm-list__body"><b>{s.name}</b><small>{s.points} bodova</small></span></div></li>
                ))}
              </ol>
            </div>
            <div className="adm-card adm-card--pad">
              <h2 className="adm-h2">Dodjela za {monthLabel(standings.previous)}</h2>
              <p className="adm-hint">Nagrade se dodjeljuju automatski 1. u mjesecu (Vercel Cron). Ako cron nije podešen ili želiš odmah, klikni ispod. Pobjednici dobijaju kod u „Moji kodovi" i obavještenje.</p>
              <ol className="adm-list" style={{ padding: 0, marginBottom: 12 }}>
                {standings.lastMonth.map((s) => <li key={s.userId}><div style={{ padding: '6px 0' }}><span className="top5__rank" style={{ width: 28 }}>{s.rank}</span><span className="adm-list__body"><b>{s.name}</b><small>{s.points} bodova</small></span></div></li>)}
              </ol>
              <button className="btn btn--pink btn--sm" onClick={awardNow}><Send className="ic" aria-hidden="true" />Dodijeli sada</button>
              {awardMsg && <p className="adm-hint" style={{ marginTop: 10, color: 'var(--text)' }}>{awardMsg}</p>}
            </div>
          </section>
        )}

        <section id="forma" className="adm-card adm-card--pad" style={{ scrollMarginTop: 80 }}>
          <div className="adm-card__head" style={{ padding: 0, border: 0, marginBottom: 12 }}>
            <h2>{editingId ? 'Uredi nagradu' : tab === 'TOP' ? 'Nova top 5 nagrada' : 'Nova nagrada za bodove'}</h2>
            {editingId && <button className="link" style={{ minHeight: 0 }} onClick={cancelEdit}>Odustani</button>}
          </div>
          <p className="adm-hint">
            {tab === 'TOP'
              ? 'Postavi nagradu za 1.–5. mjesto za mjesec (najbolje na početku mjeseca). Takmiči se po bodovima zarađenim u tom mjesecu, a nagrade se dijele početkom sljedećeg.'
              : 'Korisnici je kupuju bodovima na stranici Nagrade. Nagradu izdaje izabrani lokal ili partner (GdjeVečeras merch, Panther Tike).'}
          </p>
          {error && <div className="alert alert--error" style={{ marginBottom: 12 }}>{error}</div>}
          <form onSubmit={submit} className="adm-form">
            <label className="field"><span>Naziv *</span><input className="input" placeholder={tab === 'TOP' ? 'npr. Panther Tike patike' : 'npr. Besplatan shot'} value={form.title} onChange={set('title')} required maxLength={80} /></label>
            <label className="field"><span>Naziv na engleskom</span><input className="input" value={form.titleEn} onChange={set('titleEn')} maxLength={80} /></label>
            <label className="field"><span>Opis</span><textarea className="input" rows={2} style={{ paddingBlock: 12 }} value={form.description} onChange={set('description')} maxLength={300} /></label>
            <label className="field"><span>Opis na engleskom</span><textarea className="input" rows={2} style={{ paddingBlock: 12 }} value={form.descriptionEn} onChange={set('descriptionEn')} maxLength={300} /></label>
            {issuerSelect}
            <label className="field"><span>Vrsta</span>
              <select className="input" value={form.kind} onChange={set('kind')}>
                {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            {tab === 'TOP' ? (
              <>
                <label className="field"><span>Mjesto *</span>
                  <select className="input" value={form.topRank} onChange={set('topRank')} disabled={Boolean(editingId)}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}. mjesto</option>)}
                  </select>
                </label>
                <label className="field"><span>Mjesec takmičenja *</span>
                  <select className="input" value={form.month} onChange={set('month')} disabled={Boolean(editingId)}>
                    {nextMonths(4).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </label>
              </>
            ) : (
              <>
                <label className="field"><span>Cijena u bodovima *</span><input className="input" type="number" min={10} max={100000} step={5} value={form.cost} onChange={set('cost')} required /></label>
                <label className="field"><span>Zaliha (prazno = neograničeno)</span><input className="input" type="number" min={0} placeholder="∞" value={form.stock} onChange={set('stock')} /></label>
              </>
            )}
            <div className="adm-form__wide">
              <ImageUploader value={form.imageUrl} onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))} label="Slika nagrade (opciono)" />
            </div>
            <button type="submit" className="btn btn--pink adm-form__wide" disabled={saving}>
              {saving ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : editingId ? <Pencil className="ic" aria-hidden="true" /> : <Plus className="ic" aria-hidden="true" />}
              {editingId ? 'Sačuvaj izmjene' : 'Dodaj nagradu'}
            </button>
          </form>
        </section>

        {tab === 'REDEEM' ? (
          <section>
            <h2 className="adm-h2">Nagrade za bodove <span className="pg__count">{redeemList.length}</span></h2>
            {redeemList.length === 0 && <p className="adm-hint">Još nema nagrada.</p>}
            <div className="adm-rewards">
              {redeemList.map((r) => (
                <RewardTile key={r.id} r={r} editing={editingId === r.id} onEdit={() => startEdit(r)} onToggle={() => update(r.id, { active: !r.active })} onRemove={() => remove(r)}>
                  <span className="pts"><span>{r.cost.toLocaleString('sr-Latn-BA')} bod.</span></span>
                  <span>{r.stock === null ? 'Zaliha: ∞' : `Zaliha: ${r.stock}`}</span>
                  <span>{r._count.redemptions} zamjena</span>
                </RewardTile>
              ))}
            </div>
          </section>
        ) : (
          topByMonth.map(([month, list]) => (
            <section key={month}>
              <h2 className="adm-h2">Top 5 — {monthLabel(month)}</h2>
              <div className="adm-rewards">
                {list.map((r) => (
                  <RewardTile key={r.id} r={r} editing={editingId === r.id} onEdit={() => startEdit(r)} onToggle={() => update(r.id, { active: !r.active })} onRemove={() => remove(r)}>
                    <span className="pts"><Crown size={13} aria-hidden="true" /><span>{r.topRank}. mjesto</span></span>
                    <span>{r.awards[0] ? `Dobitnik: ${r.awards[0].user.name}` : month < monthKey() ? 'Čeka dodjelu' : 'Takmičenje traje'}</span>
                  </RewardTile>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}

function RewardTile({ r, editing, onEdit, onToggle, onRemove, children }: { r: AdminReward; editing: boolean; onEdit: () => void; onToggle: () => void; onRemove: () => void; children: React.ReactNode }) {
  return (
    <article className={`adm-reward${r.active ? '' : ' is-off'}${editing ? ' is-editing' : ''}`}>
      <div className="adm-reward__img">
        {r.imageUrl ? <img src={r.imageUrl} alt="" loading="lazy" /> : <PosterArt seed={r.id} className="event__art" />}
        <RewardKindIcon kind={r.kind} />
        {!r.active && <span className="adm-pill">Sakriveno</span>}
      </div>
      <div className="adm-reward__body">
        <b>{r.title}</b>
        <small>{rewardIssuer(r)} · {KIND_LABEL[r.kind] || r.kind}</small>
        <div className="adm-reward__meta">{children}</div>
      </div>
      <div className="adm-reward__actions">
        <button onClick={onEdit} aria-label={`Uredi ${r.title}`}><Pencil size={16} />Uredi</button>
        <button onClick={onToggle}>{r.active ? <><EyeOff size={16} />Sakrij</> : <><Eye size={16} />Prikaži</>}</button>
        <button onClick={onRemove} className="is-danger" aria-label={`Obriši ${r.title}`}><Trash2 size={16} />Obriši</button>
      </div>
    </article>
  );
}
