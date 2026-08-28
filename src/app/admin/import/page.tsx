'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import {
  Upload, FileText, Building2, Calendar, ImageIcon, SkipForward,
  Save, Loader2, CheckCircle2, XCircle, AlertTriangle, RotateCcw, ArrowRight
} from 'lucide-react';

// ============================== TIPOVI ==============================
type ParsedItem = {
  kind: 'VENUE' | 'EVENT';
  line: number;
  // lokal
  name?: string; address?: string; city?: string; description?: string;
  // događaj
  title?: string; venueName?: string; date?: string; time?: string;
  category?: string; price?: string;
  error?: string;
};

type QueueItem = ParsedItem & {
  status: 'pending' | 'done' | 'skipped' | 'error';
  message?: string;
};

const EXAMPLE = `# Format: jedna stavka po liniji
LOKAL;Club Cristal;Dositejeva bb;Gradiška;Najpopularniji klub u regiji
LOKAL;Pub Dva Prijatelja;Vidovdanska 12;Gradiška
DOGAĐAJ;Techno Invasion;Club Cristal;Gradiška;2026-09-05;22:00;PARTY;10
DOGAĐAJ;Acoustic Night;Pub Dva Prijatelja;Gradiška;06.09.2026;21:00;MUZIKA;0`;

// ============================== PARSER ==============================
function splitDelimitedLine(line: string): string[] {
  const counts = new Map<string, number>([[';', 0], [',', 0], ['\t', 0]]);
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && counts.has(line[i])) {
      counts.set(line[i], (counts.get(line[i]) || 0) + 1);
    }
  }

  const delimiter = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const parts: string[] = [];
  let value = '';
  quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      parts.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  parts.push(value.trim());
  return parts;
}

function parseImport(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split(/\r?\n/);
  let first = true;

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) return;
    if (first && /naziv|name|title/i.test(line) && !/^(lok|ven|eve|doga)/i.test(line)) {
      first = false; // header red — preskoči
      return;
    }
    first = false;

    const parts = splitDelimitedLine(line);
    const prefix = parts[0].toLowerCase();

    if (prefix.startsWith('lok') || prefix.startsWith('ven')) {
      // LOKAL;Naziv;Adresa;Grad;Opis?
      const [, name, address, city, description] = parts;
      if (!name || !city) {
        items.push({ kind: 'VENUE', line: idx + 1, name, city, error: 'Nedostaju naziv ili grad' });
      } else {
        items.push({ kind: 'VENUE', line: idx + 1, name, address: address || '', city, description: description || '' });
      }
    } else if (prefix.startsWith('doga') || prefix.startsWith('eve')) {
      // DOGAĐAJ;Naslov;Lokal;Grad;Datum;Vrijeme;Kategorija?;Cijena?;Opis?
      const [, title, venueName, city, date, time, category, price, description] = parts;
      const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date || '') || /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(date || '');
      if (!title || !venueName || !dateOk) {
        items.push({
          kind: 'EVENT', line: idx + 1, title, venueName, city, date, time, category, price,
          error: !dateOk ? 'Datum mora biti YYYY-MM-DD ili DD.MM.YYYY' : 'Nedostaju naslov ili lokal',
        });
      } else {
        items.push({ kind: 'EVENT', line: idx + 1, title, venueName, city, date, time: time || '20:00', category: category || 'PARTY', price: price || '', description: description || '' });
      }
    } else {
      items.push({ kind: 'VENUE', line: idx + 1, error: `Nepoznat tip "${parts[0]}" — počni liniju sa LOKAL ili DOGAĐAJ` });
    }
  });

  return items;
}

// ============================== STRANICA ==============================
export default function ImportPage() {
  const [role, setRole] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'wizard' | 'done'>('upload');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');

  // trenutni element u čarobnjaku
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemError, setItemError] = useState('');

  // izmjene polja trenutnog elementa
  const [edit, setEdit] = useState<Record<string, string>>({});

  // lista lokala za događaje
  const [venues, setVenues] = useState<{ id: string; name: string; city: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRole(d?.user?.role || 'guest'))
      .catch(() => setRole('guest'));
    fetch('/api/venues?limit=300')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setVenues(Array.isArray(d) ? d.map((v: any) => ({ id: v.id, name: v.name, city: v.city })) : []))
      .catch(() => {});
  }, []);

  const startParse = (text: string, name?: string) => {
    const parsed = parseImport(text);
    if (parsed.length === 0) return;
    setQueue(parsed.map((p) => ({ ...p, status: p.error ? 'error' : 'pending' })));
    setFileName(name || 'lijepljeni tekst');
    setStep('review');
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    startParse(text, f.name);
  };

  const beginWizard = () => {
    const firstPending = queue.findIndex((q) => q.status === 'pending');
    loadItem(firstPending >= 0 ? firstPending : 0);
    setStep('wizard');
  };

  const loadItem = (idx: number) => {
    const q = queue[idx];
    setCurrent(idx);
    setImageUrl(null);
    setItemError('');
    setEdit(
      q.kind === 'VENUE'
        ? { name: q.name || '', address: q.address || '', city: q.city || '', description: q.description || '' }
        : { title: q.title || '', venueName: q.venueName || '', city: q.city || '', date: q.date || '', time: q.time || '20:00', category: q.category || 'PARTY', price: q.price || '', description: q.description || '', venueId: '' }
    );
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setItemError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setImageUrl(data.url);
      else setItemError(data.error || 'Upload slike nije uspio — možeš nastaviti i bez slike.');
    } catch {
      setItemError('Upload slike nije uspio — možeš nastaviti i bez slike.');
    } finally {
      setUploading(false);
    }
  };

  const finishItem = (idx: number, status: QueueItem['status'], message?: string) => {
    setQueue((q) => q.map((item, i) => (i === idx ? { ...item, status, message } : item)));
    const next = queue.findIndex((item, i) => i > idx && item.status === 'pending');
    if (next >= 0) {
      loadItem(next);
    } else {
      setStep('done');
    }
  };

  const saveCurrent = async () => {
    const q = queue[current];
    if (!q) return;
    setSaving(true);
    setItemError('');
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: q.kind,
          imageUrl,
          data: q.kind === 'VENUE'
            ? { name: edit.name, address: edit.address, city: edit.city, description: edit.description }
            : {
                title: edit.title,
                venueId: edit.venueId || undefined,
                venueName: edit.venueName,
                city: edit.city,
                date: edit.date,
                time: edit.time,
                category: edit.category,
                price: edit.price,
                description: edit.description,
              },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (q.kind === 'VENUE' && data.venue) {
          setVenues((v) => [...v, { id: data.venue.id, name: data.venue.name, city: data.venue.city }]);
        }
        finishItem(current, 'done', data.message || 'Unešeno.');
      } else {
        setItemError(data.error || 'Greška pri čuvanju.');
      }
    } catch {
      setItemError('Mrežna greška.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setQueue([]); setCurrent(0); setPasted(''); setFileName(''); setImageUrl(null); setStep('upload');
  };

  if (role === null) {
    return <div className="p-8 text-center animate-pulse text-muted uppercase text-xs font-black tracking-widest">Učitavanje…</div>;
  }
  if (role !== 'ADMIN') {
    return (
      <div className="p-8">
        <AdminHeader title="Masovni uvoz" />
        <div className="mt-8 bg-card border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertTriangle size={32} className="text-red-500 mx-auto mb-4" />
          <p className="text-white font-bold">Pristup odbijen — samo administrator.</p>
        </div>
      </div>
    );
  }

  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const skippedCount = queue.filter((q) => q.status === 'skipped').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;
  const q = queue[current];
  const matchedVenue = q?.kind === 'EVENT' ? venues.find((v) => v.name.toLowerCase() === (edit.venueName || '').toLowerCase()) : undefined;

  const inputCls = 'w-full h-12 bg-surface border border-border rounded-xl px-4 text-sm font-medium text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-[10px] font-bold text-muted uppercase tracking-widest mb-2';

  return (
    <div className="p-4 md:p-8">
      <AdminHeader title="Masovni uvoz" />

      {/* ============ KORAK 1: UPLOAD ============ */}
      {step === 'upload' && (
        <div className="max-w-3xl space-y-6">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            className="bg-card border-2 border-dashed border-border rounded-3xl p-10 md:p-16 text-center cursor-pointer hover:border-primary/50 transition-colors focus-visible:border-primary"
          >
            <Upload size={40} className="text-primary mx-auto mb-5" />
            <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Ubaci CSV / TXT fajl</p>
            <p className="text-muted text-sm">klikni za izbor fajla (ili ubaci tekst ispod)</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-4">
            <p className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Ili zalijepi tekst
            </p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              placeholder={EXAMPLE}
              className="w-full bg-surface border border-border rounded-xl p-4 text-sm font-mono text-white placeholder:text-muted/50 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={() => pasted.trim() && startParse(pasted)}
              disabled={!pasted.trim()}
              className="h-12 px-8 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all disabled:opacity-50"
            >
              Analiziraj tekst
            </button>
          </div>

          <div className="bg-elevated border border-border rounded-3xl p-6 md:p-8">
            <p className="text-white font-black uppercase tracking-widest text-xs mb-4">Format fajla</p>
            <pre className="bg-surface border border-border rounded-xl p-4 text-xs font-mono text-muted overflow-x-auto scrollbar-hide leading-relaxed">{EXAMPLE}</pre>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>• <span className="text-white font-bold">LOKAL</span>;Naziv;Adresa;Grad;Opis(opcija)</li>
              <li>• <span className="text-white font-bold">DOGAĐAJ</span>;Naslov;Naziv lokala;Grad;Datum;Vrijeme;Kategorija;Cijena(opc);Opis(opc)</li>
              <li>• Separator: tačka-zarez, zarez ili TAB · Datum: 2026-09-05 ili 05.09.2026 · Kategorija: PARTY ili MUZIKA</li>
              <li>• Linije sa # se preskaču · Slika se dodaje kasnije u čarobnjaku (nije obavezna)</li>
            </ul>
          </div>
        </div>
      )}

      {/* ============ KORAK 2: PREGLED ============ */}
      {step === 'review' && (
        <div className="max-w-3xl space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <p className="text-sm text-muted mb-2">Fajl: <span className="text-white font-bold">{fileName}</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Za uvoz', value: pendingCount, cls: 'text-white' },
                { label: 'Lokali', value: queue.filter((x) => x.kind === 'VENUE' && !x.error).length, cls: 'text-white' },
                { label: 'Događaji', value: queue.filter((x) => x.kind === 'EVENT' && !x.error).length, cls: 'text-white' },
                { label: 'Greške', value: errorCount, cls: errorCount ? 'text-red-400' : 'text-muted' },
              ].map((s) => (
                <div key={s.label} className="bg-surface border border-border rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <button
              onClick={beginWizard}
              disabled={pendingCount === 0}
              className="mt-6 h-14 w-full sm:w-auto px-10 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all disabled:opacity-50 inline-flex items-center justify-center gap-3"
            >
              Počni uvoz <ArrowRight size={16} />
            </button>
          </div>

          <div className="bg-card border border-border rounded-3xl overflow-hidden">
            {queue.map((item, i) => (
              <div key={i} className={`flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0 ${item.error ? 'bg-red-500/5' : ''}`}>
                {item.kind === 'VENUE' ? <Building2 size={18} className="text-primary shrink-0" /> : <Calendar size={18} className="text-primary shrink-0" />}
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.error ? `Linija ${item.line}` : (item.name || item.title)}</p>
                  <p className="text-xs text-muted truncate">
                    {item.error ? <span className="text-red-400">{item.error}</span> : item.kind === 'VENUE' ? `Lokal · ${item.city}` : `${item.date} ${item.time} · ${item.venueName}`}
                  </p>
                </div>
                {item.error ? <XCircle size={18} className="text-red-400 shrink-0" /> : <CheckCircle2 size={18} className="text-muted/40 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ KORAK 3: ČAROBNJAK ============ */}
      {step === 'wizard' && q && (
        <div className="max-w-2xl space-y-6">
          {/* progres */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-black text-white uppercase tracking-widest">
                {current + 1} / {queue.length} — {q.kind === 'VENUE' ? 'Lokal' : 'Događaj'}
              </p>
              <p className="text-xs text-muted">{doneCount} unešeno · {skippedCount} preskočeno</p>
            </div>
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((current + 1) / queue.length) * 100}%` }} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-5">
            {q.kind === 'VENUE' ? (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><label className={labelCls}>Naziv</label><input className={inputCls} value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
                  <div><label className={labelCls}>Grad</label><input className={inputCls} value={edit.city || ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></div>
                </div>
                <div><label className={labelCls}>Adresa</label><input className={inputCls} value={edit.address || ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></div>
                <div><label className={labelCls}>Opis (opcija)</label><textarea rows={2} className="w-full bg-surface border border-border rounded-xl p-4 text-sm text-white focus:outline-none focus:border-primary transition-colors" value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              </>
            ) : (
              <>
                <div><label className={labelCls}>Naslov</label><input className={inputCls} value={edit.title || ''} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Lokal {matchedVenue ? '✓ pronađen' : '(izaberi iz liste)'}</label>
                    <select className={inputCls} value={edit.venueId || ''} onChange={(e) => setEdit({ ...edit, venueId: e.target.value })}>
                      <option value="">{edit.venueName ? `${edit.venueName} — podudaranje po nazivu` : '— izaberi lokal —'}</option>
                      {venues.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.city})</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>Kategorija</label>
                    <select className={inputCls} value={edit.category || 'PARTY'} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                      <option value="PARTY">Žurka</option>
                      <option value="LIVE_MUSIC">Muzika uživo</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><label className={labelCls}>Datum</label><input className={inputCls} placeholder="2026-09-05" value={edit.date || ''} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></div>
                  <div><label className={labelCls}>Vrijeme</label><input className={inputCls} placeholder="22:00" value={edit.time || ''} onChange={(e) => setEdit({ ...edit, time: e.target.value })} /></div>
                  <div><label className={labelCls}>Cijena KM (opc)</label><input className={inputCls} placeholder="10" value={edit.price || ''} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></div>
                </div>
              </>
            )}

            {/* SLIKA — nije obavezna */}
            <div className="bg-elevated border border-border rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={14} className="text-primary" /> Naslovna slika (nije obavezna)
              </p>
              {imageUrl ? (
                <div className="flex items-center gap-4">
                  <img src={imageUrl} alt="Pregled naslovne slike" className="w-24 h-24 rounded-xl object-cover border border-border" />
                  <button onClick={() => setImageUrl(null)} className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors">Ukloni sliku</button>
                </div>
              ) : (
                <label className="flex items-center gap-3 cursor-pointer text-sm text-muted hover:text-white transition-colors">
                  {uploading ? <Loader2 size={18} className="animate-spin text-primary" /> : <Upload size={18} className="text-primary" />}
                  {uploading ? 'Upload u toku…' : 'Izaberi sliku (JPG/PNG, max 10MB) — ili preskoči'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} disabled={uploading} />
                </label>
              )}
            </div>

            {itemError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4" role="alert">{itemError}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => finishItem(current, 'skipped', 'Preskočeno')}
                disabled={saving}
                className="h-14 flex-1 bg-white/5 border border-white/10 text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-white/10 transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <SkipForward size={16} /> Preskoči
              </button>
              <button
                onClick={saveCurrent}
                disabled={saving || uploading}
                className="h-14 flex-1 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Sačuvaj i nastavi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ KORAK 4: REZULTAT ============ */}
      {step === 'done' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 md:p-10 text-center space-y-6">
            <CheckCircle2 size={44} className="text-primary mx-auto" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Uvoz završen!</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded-2xl p-4"><p className="text-2xl font-black text-white">{doneCount}</p><p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Unešeno</p></div>
              <div className="bg-surface border border-border rounded-2xl p-4"><p className="text-2xl font-black text-white">{skippedCount}</p><p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Preskočeno</p></div>
              <div className="bg-surface border border-border rounded-2xl p-4"><p className="text-2xl font-black text-white">{errorCount}</p><p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Grešaka</p></div>
            </div>
            <button onClick={reset} className="h-14 px-10 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all inline-flex items-center gap-3">
              <RotateCcw size={16} /> Novi uvoz
            </button>
          </div>

          {queue.some((x) => x.status === 'error' || x.status === 'skipped') && (
            <div className="bg-card border border-border rounded-3xl overflow-hidden">
              {queue.filter((x) => x.status !== 'done').map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border/50 last:border-0">
                  <AlertTriangle size={16} className={item.status === 'error' ? 'text-red-400' : 'text-muted'} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.name || item.title || `Linija ${item.line}`}</p>
                    <p className="text-xs text-muted truncate">{item.message || item.error}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
