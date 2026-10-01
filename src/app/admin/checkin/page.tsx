'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Download, QrCode, RefreshCw, AlertTriangle, Printer, Rocket, Star, Receipt, Search } from 'lucide-react';

interface CheckInVenue {
  id: string; name: string; slug: string; city: string;
  latitude: number | null; longitude: number | null;
  isPartner: boolean; boostedUntil: string | null; checkInVersion: number;
  receiptBoostEnabled: boolean; receiptMinAmount: number; receiptBonusPoints: number;
  points: number; checkIns30d: number; checkInUrl: string;
}

const fmtUntil = (iso: string) => new Date(iso).toLocaleString('sr-Latn-BA', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminCheckIn() {
  const [venues, setVenues] = useState<CheckInVenue[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    (async () => {
      const [venuesRes, sessionRes] = await Promise.all([fetch('/api/admin/checkin'), fetch('/api/auth/session')]);
      if (venuesRes.ok) setVenues(await venuesRes.json());
      if (sessionRes.ok) setRole((await sessionRes.json()).user.role);
      setLoading(false);
    })();
  }, []);

  const patch = async (venueId: string, body: Record<string, unknown>) => {
    setMessage('');
    const res = await fetch('/api/admin/checkin', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId, ...body }) });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || 'Greška.'); return; }
    setVenues((prev) => prev.map((v) => (v.id === venueId ? { ...v, ...data } : v)));
  };

  const regenerate = (venue: CheckInVenue) => {
    if (!confirm(`Napraviti novi QR kod za ${venue.name}? Stari (odštampani) kod prestaje da važi odmah.`)) return;
    patch(venue.id, { regenerate: true });
  };

  const boosted = (v: CheckInVenue) => Boolean(v.boostedUntil && new Date(v.boostedUntil).getTime() > Date.now());
  const list = venues.filter((v) => `${v.name} ${v.city}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <AdminHeader title="Check-in, QR i boost" />
      <main className="adm-main">
        <div className="adm-card adm-card--pad">
          <div className="adm-rules">
            <div><b>+10</b><span>svaki lokal</span></div>
            <div><b>+30</b><span>partner lokal</span></div>
            <div><b>+30</b><span>boost za vikend</span></div>
            <div><b>×1.5 → ×2…</b><span>niz vikenda (3+, +0.5 na svaka 2)</span></div>
            <div><b>+bonus</b><span>račun iznad iznosa (po lokalu)</span></div>
          </div>
          <p className="adm-hint" style={{ margin: '14px 0 0' }}>
            Svaki lokal ima svoj QR kod — odštampaj ga i stavi na ulaz ili šank. Gost se može čekirati jednom u 12h.
            Check-in fotkom radi samo kad lokal ima unesene koordinate.
          </p>
        </div>
        {message && <div className="alert alert--error">{message}</div>}

        <div className="adm-row">
          <div className="field__box" style={{ flex: '1 1 260px', maxWidth: 420 }}>
            <Search className="ic" aria-hidden="true" />
            <input className="input" placeholder="Traži lokal…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Traži lokal" />
          </div>
        </div>

        {loading ? (
          <div className="skel" style={{ minHeight: 200 }} />
        ) : list.length === 0 ? (
          <p className="adm-hint">Nema lokala.</p>
        ) : (
          <div className="adm-venues">
            {list.map((v) => (
              <article key={v.id} className={`adm-venue${v.isPartner ? ' is-partner' : ''}${boosted(v) ? ' is-boosted' : ''}`}>
                <div className="adm-venue__head">
                  <div style={{ minWidth: 0 }}>
                    <h2>{v.name}</h2>
                    <p>{v.city} · {v.checkIns30d} check-ina (30 dana)</p>
                  </div>
                  <span className="adm-venue__pts">+{v.points}</span>
                </div>

                <div className="adm-venue__toggles">
                  <label className={`toggle${isAdmin ? '' : ' is-disabled'}`}>
                    <input type="checkbox" checked={v.isPartner} disabled={!isAdmin} onChange={(e) => patch(v.id, { isPartner: e.target.checked })} />
                    <span className="toggle__track"><span className="toggle__thumb" /></span>
                    <span className="toggle__text"><Star size={15} aria-hidden="true" />Partner (+30)</span>
                  </label>
                  {isAdmin ? (
                    boosted(v)
                      ? <button className="btn btn--pink btn--sm" onClick={() => patch(v.id, { boost: null })}><Rocket className="ic" aria-hidden="true" />Boost do {fmtUntil(v.boostedUntil!)} · ukloni</button>
                      : <button className="btn btn--ghost btn--sm" onClick={() => patch(v.id, { boost: 'weekend' })}><Rocket className="ic" aria-hidden="true" />Boostuj za vikend</button>
                  ) : boosted(v) ? <span className="adm-pill adm-pill--ok">Boost do {fmtUntil(v.boostedUntil!)}</span> : null}
                </div>

                <div className="adm-venue__receipt">
                  <label className={`toggle${isAdmin ? '' : ' is-disabled'}`}>
                    <input type="checkbox" checked={v.receiptBoostEnabled} disabled={!isAdmin} onChange={(e) => patch(v.id, { receiptBoostEnabled: e.target.checked })} />
                    <span className="toggle__track"><span className="toggle__thumb" /></span>
                    <span className="toggle__text"><Receipt size={15} aria-hidden="true" />Bonus za račun</span>
                  </label>
                  {v.receiptBoostEnabled && (
                    <div className="adm-row" style={{ alignItems: 'center' }}>
                      <label className="adm-inline">Račun od
                        <input className="input" type="number" min={1} step="0.01" defaultValue={v.receiptMinAmount} disabled={!isAdmin}
                          onBlur={(e) => { const n = Number(e.target.value); if (n !== v.receiptMinAmount) patch(v.id, { receiptMinAmount: n }); }} />
                        KM
                      </label>
                      <label className="adm-inline">donosi +
                        <input className="input" type="number" min={1} max={1000} defaultValue={v.receiptBonusPoints} disabled={!isAdmin}
                          onBlur={(e) => { const n = Number(e.target.value); if (n !== v.receiptBonusPoints) patch(v.id, { receiptBonusPoints: n }); }} />
                        bod.
                      </label>
                    </div>
                  )}
                </div>

                {(v.latitude === null || v.longitude === null) && (
                  <p className="adm-warn"><AlertTriangle size={15} aria-hidden="true" /> Nema koordinata — radi samo QR check-in, ne i fotka + lokacija.</p>
                )}

                <div className="adm-row">
                  <button onClick={() => setOpen(open === v.id ? null : v.id)} className="btn btn--ghost btn--sm"><QrCode className="ic" aria-hidden="true" />{open === v.id ? 'Sakrij QR' : 'Prikaži QR'}</button>
                  <a href={`/api/admin/checkin/qr?venueId=${v.id}&download=1`} className="btn btn--ghost btn--sm"><Download className="ic" aria-hidden="true" />SVG</a>
                  <button onClick={() => regenerate(v)} className="btn btn--ghost btn--sm"><RefreshCw className="ic" aria-hidden="true" />Novi kod</button>
                </div>
                {open === v.id && (
                  <div className="adm-qr">
                    <img src={`/api/admin/checkin/qr?venueId=${v.id}&v=${v.checkInVersion}`} alt={`QR kod za ${v.name}`} />
                    <b>Skeniraj i skupljaj bodove</b>
                    <span>GdjeVečeras · {v.name}</span>
                    <button onClick={() => window.print()} className="adm-qr__print"><Printer size={14} aria-hidden="true" /> Štampaj</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
