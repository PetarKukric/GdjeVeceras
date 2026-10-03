'use client';

import React, { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { Download } from 'lucide-react';
import { getSarajevoNow } from '@/lib/bosnia-time';

type ExportType = 'checkins' | 'signups' | 'events';

/** Datum u Sarajevu pomjeren za `offset` dana, kao "GGGG-MM-DD". */
const sarajevoDay = (offset: number) => new Date(getSarajevoNow().getTime() + offset * 86_400_000).toISOString().slice(0, 10);

const EXPORTS: { type: ExportType; title: string; text: string; from: number; to: number }[] = [
  { type: 'checkins', title: 'Check-ini', text: 'Svaki check-in: lokal, grad, partner, metoda, bodovi, redni broj check-ina korisnika i bonus za račun.', from: -7, to: -1 },
  { type: 'signups', title: 'Registracije', text: 'Novi nalozi: Google ili email, potvrđen email, broj check-ina i koliko dana do prvog check-ina.', from: -7, to: -1 },
  { type: 'events', title: 'Događaji', text: 'Događaji po datumu početka: grad, lokal, kategorija, status, sačuvano i check-ini.', from: 0, to: 13 },
];

function ExportCard({ item }: { item: (typeof EXPORTS)[number] }) {
  const [from, setFrom] = useState(() => sarajevoDay(item.from));
  const [to, setTo] = useState(() => sarajevoDay(item.to));
  const valid = Boolean(from && to && from <= to);

  return (
    <div className="adm-card adm-card--pad">
      <h2 className="adm-h2">{item.title}</h2>
      <p className="adm-hint" style={{ marginTop: 6 }}>{item.text}</p>
      <div className="adm-form">
        <label className="field"><span>Od</span><input id={`${item.type}-from`} className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>Do</span><input id={`${item.type}-to`} className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <div className="adm-row" style={{ marginTop: 14 }}>
        {valid ? (
          <a className="btn btn--pink btn--sm" href={`/api/admin/export?type=${item.type}&from=${from}&to=${to}`}>
            <Download className="ic" aria-hidden="true" />{item.type}-{to}.csv
          </a>
        ) : (
          <span className="adm-hint" role="alert" style={{ margin: 0 }}>&quot;Do&quot; mora biti isti dan ili poslije &quot;Od&quot;.</span>
        )}
      </div>
    </div>
  );
}

export default function AdminExport() {
  return (
    <>
      <AdminHeader title="Izvoz podataka" />
      <main className="adm-main">
        <div className="adm-card adm-card--pad">
          <p className="adm-hint" style={{ margin: 0 }}>
            CSV za marketing agente. Preuzeti fajl stavi u <code>.agents/marketing-team/data/</code> bez mijenjanja imena.
            Ime nosi zadnji dan perioda. Fajlovi nemaju imena ni emailove korisnika, samo anonimnu oznaku <code>user_ref</code>.
          </p>
        </div>
        <div className="adm-cols" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {EXPORTS.map((item) => <ExportCard key={item.type} item={item} />)}
        </div>
      </main>
    </>
  );
}
