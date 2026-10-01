'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Avatar } from '@/components/ui/Avatar';
import { Check, QrCode, X } from 'lucide-react';

interface Claim {
  id: string; amount: number; photoUrl: string; qrData: string | null; status: string; points: number; note: string | null;
  createdAt: string; reviewedAt: string | null;
  user: { id: string; name: string | null; avatarUrl: string | null };
  venue: { name: string; receiptMinAmount: number; receiptBonusPoints: number };
  checkIn: { createdAt: string; method: string };
}

const STATUSES = [['PENDING', 'Na čekanju'], ['APPROVED', 'Odobreni'], ['REJECTED', 'Odbijeni']] as const;
const when = (iso: string) => new Date(iso).toLocaleString('sr-Latn-BA', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminReceipts() {
  const [status, setStatus] = useState<string>('PENDING');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  const load = async (s = status) => {
    setLoading(true);
    const res = await fetch(`/api/admin/receipts?status=${s}`);
    if (res.ok) setClaims(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(status); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (c: Claim, approve: boolean) => {
    let note: string | null = null;
    if (!approve) { note = window.prompt('Razlog odbijanja (vidi ga gost):', 'Iznos ili račun nisu ispravni'); if (note === null) return; }
    setBusy(c.id); setMsg('');
    const res = await fetch('/api/admin/receipts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, approve, note }) });
    const data = await res.json();
    setBusy('');
    if (!res.ok) { setMsg(data.error || 'Greška.'); return; }
    setClaims((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <>
      <AdminHeader title="Računi za bonus" />
      <main className="adm-main">
        <p className="adm-hint">Gost poslije check-ina slika račun (i skenira QR fiskalnog računa ako može). Provjeri iznos, datum i naziv lokala na računu, pa odobri — bodovi idu gostu tek tada. Isti fiskalni račun se ne može prijaviti dvaput.</p>
        <div className="seg" style={{ marginTop: 0 }} role="group" aria-label="Status">
          {STATUSES.map(([key, label]) => <button key={key} type="button" className="seg__btn" aria-pressed={status === key} onClick={() => setStatus(key)}>{label}</button>)}
        </div>
        {msg && <div className="alert alert--error">{msg}</div>}
        {loading ? <div className="skel" style={{ minHeight: 200 }} /> : claims.length === 0 ? (
          <div className="empty"><b>Nema zahtjeva</b>{status === 'PENDING' ? 'Svi računi su pregledani.' : 'Ovdje još nema ničega.'}</div>
        ) : (
          <div className="adm-claims">
            {claims.map((c) => {
              const short = c.amount < c.venue.receiptMinAmount;
              return (
                <article key={c.id} className="adm-claim">
                  <button type="button" className="adm-claim__img" onClick={() => setZoom(c.photoUrl)} aria-label="Uvećaj račun"><img src={c.photoUrl} alt="Fotka računa" loading="lazy" /></button>
                  <div className="adm-claim__body">
                    <div className="adm-claim__who"><Avatar name={c.user.name} url={c.user.avatarUrl} className="row__av" /><div><b>{c.user.name}</b><small>{c.venue.name} · check-in {when(c.checkIn.createdAt)}</small></div></div>
                    <p className="adm-claim__amount"><b className={short ? 'is-bad' : ''}>{c.amount.toFixed(2)} KM</b> <small>prag {c.venue.receiptMinAmount} KM → +{c.venue.receiptBonusPoints}</small></p>
                    {c.qrData ? <p className="adm-claim__qr"><QrCode size={14} aria-hidden="true" /> Fiskalni QR očitan: <code>{c.qrData.slice(0, 90)}{c.qrData.length > 90 ? '…' : ''}</code></p>
                      : <p className="adm-claim__qr is-warn">Bez QR koda — provjeri fotku pažljivo.</p>}
                    {c.note && <p className="adm-hint" style={{ margin: 0 }}>Napomena: {c.note}</p>}
                    {c.status === 'PENDING' ? (
                      <div className="adm-row">
                        <button className="btn btn--pink btn--sm" disabled={busy === c.id} onClick={() => decide(c, true)}><Check className="ic" aria-hidden="true" />Odobri +{c.venue.receiptBonusPoints}</button>
                        <button className="btn btn--ghost btn--sm" disabled={busy === c.id} onClick={() => decide(c, false)}><X className="ic" aria-hidden="true" />Odbij</button>
                      </div>
                    ) : <span className={`adm-pill ${c.status === 'APPROVED' ? 'adm-pill--ok' : ''}`}>{c.status === 'APPROVED' ? `Odobreno +${c.points}` : 'Odbijeno'} · {c.reviewedAt ? when(c.reviewedAt) : ''}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {zoom && (
          <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
            <button className="lightbox__btn lightbox__close" aria-label="Zatvori"><X className="ic" aria-hidden="true" /></button>
            <figure><img src={zoom} alt="Račun" /></figure>
          </div>
        )}
      </main>
    </>
  );
}
