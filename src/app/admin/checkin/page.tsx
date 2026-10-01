'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Download, QrCode, RefreshCw, AlertTriangle, Printer } from 'lucide-react';

interface CheckInVenue {
  id: string; name: string; slug: string; city: string;
  latitude: number | null; longitude: number | null;
  isPartner: boolean; checkInPoints: number; checkInVersion: number;
  checkIns30d: number; checkInUrl: string | null;
}

export default function AdminCheckIn() {
  const [venues, setVenues] = useState<CheckInVenue[]>([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    const [venuesRes, sessionRes] = await Promise.all([fetch('/api/admin/checkin'), fetch('/api/auth/session')]);
    if (venuesRes.ok) setVenues(await venuesRes.json());
    if (sessionRes.ok) setRole((await sessionRes.json()).user.role);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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

  return (
    <>
      <AdminHeader title="Check-in i QR kodovi" />
      <main className="adm-main">
        <div className="bg-card border border-border rounded-2xl p-5 text-sm text-muted leading-relaxed">
          <p className="text-white font-bold mb-1">Kako radi</p>
          Partner lokali daju bodove za check-in. Odštampaj QR kod i postavi ga na ulaz ili šank — gosti ga skeniraju kamerom telefona
          (otvara se <b className="text-white">/checkin</b>) ili iz aplikacije. Drugi način je fotka + lokacija: gost mora biti do ~150 m od lokala,
          zato lokal mora imati unesene koordinate. Isti gost može se čekirati u isti lokal jednom u 12h.
        </div>
        {message && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm">{message}</div>}

        {loading ? (
          <div className="h-40 bg-card border border-border rounded-2xl animate-pulse" />
        ) : venues.length === 0 ? (
          <p className="text-muted">Nema lokala.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {venues.map((v) => (
              <article key={v.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold break-words" style={{ fontFamily: 'var(--font-body)', letterSpacing: 0 }}>{v.name}</h2>
                    <p className="text-sm text-muted">{v.city} · {v.checkIns30d} check-ina (30 dana)</p>
                  </div>
                  {role === 'ADMIN' ? (
                    <label className="toggle shrink-0">
                      <input type="checkbox" checked={v.isPartner} onChange={(e) => patch(v.id, { isPartner: e.target.checked })} />
                      <span className="toggle__track"><span className="toggle__thumb" /></span>
                      <span className="toggle__text">Partner</span>
                    </label>
                  ) : (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${v.isPartner ? 'bg-primary text-white' : 'bg-surface text-muted'}`}>{v.isPartner ? 'Partner' : 'Nije partner'}</span>
                  )}
                </div>

                {v.isPartner && (
                  <>
                    {(v.latitude === null || v.longitude === null) && (
                      <p className="flex gap-2 text-xs text-amber-200 bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                        <AlertTriangle size={16} className="shrink-0" /> Lokal nema koordinate — radi samo QR check-in, ne i fotka + lokacija. Dodaj koordinate u uređivanju lokala.
                      </p>
                    )}
                    <label className="flex items-center gap-3 text-sm">
                      <span className="text-muted">Bodovi po check-inu</span>
                      <input
                        type="number" min={10} max={1000} step={10} defaultValue={v.checkInPoints}
                        className="w-24 bg-surface border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                        onBlur={(e) => { const n = Number(e.target.value); if (n !== v.checkInPoints) patch(v.id, { checkInPoints: n }); }}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setOpen(open === v.id ? null : v.id)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-sm">
                        <QrCode size={16} /> {open === v.id ? 'Sakrij QR' : 'Prikaži QR'}
                      </button>
                      <a href={`/api/admin/checkin/qr?venueId=${v.id}&download=1`} className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold">
                        <Download size={16} /> Preuzmi SVG
                      </a>
                      <button onClick={() => regenerate(v)} className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-bold text-muted hover:text-white">
                        <RefreshCw size={16} /> Novi kod
                      </button>
                    </div>
                    {open === v.id && (
                      <div className="rounded-2xl bg-white p-5 text-center text-black">
                        <img src={`/api/admin/checkin/qr?venueId=${v.id}&v=${v.checkInVersion}`} alt={`QR kod za ${v.name}`} className="mx-auto w-56 h-56" />
                        <p className="mt-3 font-black text-lg">Skeniraj i skupljaj bodove</p>
                        <p className="text-sm">GdjeVečeras · {v.name} · +{v.checkInPoints}</p>
                        <button onClick={() => window.print()} className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline print:hidden"><Printer size={14} /> Štampaj</button>
                        <p className="mt-2 text-[11px] text-neutral-500 break-all print:hidden">{v.checkInUrl}</p>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
