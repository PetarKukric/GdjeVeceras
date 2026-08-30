'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { SUPPORTED_CITIES } from '@/lib/cities';
import {
  Upload, FileText, Building2, Calendar, ImageIcon, SkipForward,
  Save, Loader2, CheckCircle2, XCircle, AlertTriangle, RotateCcw, ArrowRight, Info
} from 'lucide-react';

// ============================== TIPOVI ==============================
type Hours = { open: string; close: string; closed: boolean };
type HoursMap = Record<'WEEKDAYS' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY', Hours>;

type ParsedItem = {
  kind: 'VENUE' | 'EVENT';
  line: number;
  error?: string;
  // lokal (blok i linija format)
  name?: string; address?: string; city?: string; phone?: string;
  website?: string; instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string;
  description?: string; tip?: string; latitude?: number; longitude?: number;
  hours?: HoursMap | null;
  // događaj (linija format)
  title?: string; venueName?: string; date?: string; time?: string;
  category?: string; price?: string;
};

type QueueItem = ParsedItem & { status: 'pending' | 'done' | 'skipped' | 'error'; message?: string };

const DAY_GROUPS: { key: keyof HoursMap; label: string; days: string[] }[] = [
  { key: 'WEEKDAYS', label: 'Radni dani (Pon–Čet)', days: ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak'] },
  { key: 'FRIDAY', label: 'Petak', days: ['Petak'] },
  { key: 'SATURDAY', label: 'Subota', days: ['Subota'] },
  { key: 'SUNDAY', label: 'Nedjelja', days: ['Nedjelja'] },
];

const EXAMPLE_BLOCK = `LOKAL #1
Ime: Peckham Pub
Lokacija: Braće Mažar i majke Marije 43, Banja Luka 78000
Grad: Banja Luka
Latitude: 44.769119
Longitude: 17.183203
Telefon: 065 035 206
Website: Nije navedeno
Instagram: https://www.instagram.com/peckham_pub/
Facebook: Nije navedeno
TikTok: Nije navedeno
Tip lokala: Pub
Opis: This time next year we'll be millionaires
Ponedjeljak: 07-00
Utorak: 07-00
Srijeda: 07-00
Četvrtak: 07-00
Petak: 07-01
Subota: 07-01
Nedjelja: 08-00`;

const EXAMPLE_LINE = `LOKAL;Club Cristal;Dositejeva bb;Gradiška;Najpopularniji klub u regiji
DOGAĐAJ;Techno Invasion;Club Cristal;Gradiška;2026-09-05;22:00;PARTY;10`;

// ============================== POMOĆNE ==============================
const NOT_SET = /nije navedeno/i;

/** URL iz markdown linka [x](y), razmota l.instagram.com redirekciju, skine ?query smetje */
function cleanUrl(raw: string): string {
  let v = (raw || '').trim();
  if (!v || NOT_SET.test(v)) return '';
  const md = v.match(/\((https?:\/\/[^)]+)\)/) || v.match(/\[(https?:\/\/[^\]]+)\]/);
  if (md) v = md[1];
  v = v.replace(/&amp;/g, '&');
  try {
    let u = new URL(v);
    if (u.hostname === 'l.instagram.com') {
      const real = u.searchParams.get('u');
      if (real) u = new URL(real);
    }
    return u.origin + u.pathname;
  } catch {
    return /^https?:\/\//.test(v) ? v : '';
  }
}

/** "Braće Mažar i majke Marije 43, Banja Luka 78000" → "Braće Mažar i majke Marije 43" */
function cleanAddress(raw: string): string {
  let v = (raw || '').trim();
  if (!v || NOT_SET.test(v)) return '';
  v = v.replace(/,\s*[^,]+\s+\d{5}\s*$/, '').trim();
  return v;
}

/** Levenshtein — za prepoznavanje tipografskih grešaka u gradu ("Banj Luka") */
function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function normalizeCity(raw: string, known: string[]): string {
  const v = (raw || '').trim();
  if (!v || NOT_SET.test(v)) return '';
  if (known.some((k) => k.toLowerCase() === v.toLowerCase())) return known.find((k) => k.toLowerCase() === v.toLowerCase()) as string;
  const norm = (s: string) => s.toLowerCase().replace(/[čć]/g, 'c').replace(/ž/g, 'z').replace(/š/g, 's').replace(/đ/g, 'd').replace(/\s+/g, '');
  for (const k of known) {
    if (Math.abs(norm(v).length - norm(k).length) <= 2 && lev(norm(v), norm(k)) <= 2) return k;
  }
  return v;
}

/** "07-00" → 07:00–00:00 · "5:30-00" → 05:30–00:00 · "Zatvoreno" → closed */
function parseDayHours(raw: string): Hours | null {
  const v = (raw || '').trim();
  if (!v) return null;
  if (/zatvoreno/i.test(v)) return { open: '', close: '', closed: true };
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;
  const p = (h: string, mm: string) => `${h.padStart(2, '0')}:${mm || '00'}`;
  return { open: p(m[1], m[2] || ''), close: p(m[3], m[4] || ''), closed: false };
}

// ============================== BLOK PARSER (izvještaj "LOKAL #1 ...") ==============================
function parseBlockFile(text: string, knownCities: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const blocks = text.split(/^LOKAL\s*#\d+\s*$/m).slice(1);

  for (const block of blocks) {
    const kv: Record<string, string> = {};
    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || /^={3,}$/.test(line) || /^[A-ZČĆŽŠĐ ]{4,}$/.test(line)) continue; // separatori i sekcije (KOORDINATE, KONTAKT...)
      const m = line.match(/^([^:]+?)\s*:\s*(.*)$/);
      if (m) {
        const key = m[1].trim();
        if (!/^[A-ZČĆŽŠĐa-zčćžšđ ]+$/.test(key) || key.includes('//')) continue; // preskoči URL-ove bez ključa
        kv[key] = m[2].trim();
      }
    }

    const name = (kv['Ime'] || '').split(',')[0].trim(); // "Q682+P3V, Banja Luka 78000" → "Q682+P3V"
    if (!name || NOT_SET.test(name)) {
      items.push({ kind: 'VENUE', line: 0, error: 'Blok bez imena lokala' });
      continue;
    }

    // radno vrijeme → 4 grupe
    const hours: HoursMap | null = (() => {
      const dayVals: Record<string, Hours | null> = {};
      for (const g of DAY_GROUPS) for (const d of g.days) dayVals[d] = kv[d] ? parseDayHours(kv[d]) : null;
      const hasAny = Object.values(dayVals).some((h) => h !== null);
      if (!hasAny) return null;
      const out: HoursMap = {} as HoursMap;
      for (const g of DAY_GROUPS) {
        const vals = g.days.map((d) => dayVals[d]).filter((h): h is Hours => h !== null);
        if (vals.length === 0) out[g.key] = { open: '', close: '', closed: true };
        else {
          const firstOpen = vals.find((h) => !h.closed);
          out[g.key] = firstOpen || vals[0];
        }
      }
      // WEEKDAYS: prvi radni dan koji nije zatvoren; svi zatvoreni → zatvoreno
      const wd = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak'].map((d) => dayVals[d]).filter((h): h is Hours => h !== null);
      if (wd.length > 0) out.WEEKDAYS = wd.find((h) => !h.closed) || wd[0];
      return out;
    })();

    const latRaw = parseFloat((kv['Latitude'] || '').replace(',', '.'));
    const lngRaw = parseFloat((kv['Longitude'] || '').replace(',', '.'));

    items.push({
      kind: 'VENUE',
      line: 0,
      name,
      address: cleanAddress(kv['Lokacija'] || ''),
      city: normalizeCity(kv['Grad'] || '', knownCities),
      phone: NOT_SET.test(kv['Telefon'] || '') ? '' : (kv['Telefon'] || '').trim(),
      website: cleanUrl(kv['Website'] || ''),
      instagramUrl: cleanUrl(kv['Instagram'] || ''),
      facebookUrl: cleanUrl(kv['Facebook'] || ''),
      tiktokUrl: cleanUrl(kv['TikTok'] || ''),
      description: NOT_SET.test(kv['Opis'] || '') ? '' : (kv['Opis'] || '').trim(),
      tip: NOT_SET.test(kv['Tip lokala'] || '') ? '' : (kv['Tip lokala'] || '').trim(),
      latitude: !isNaN(latRaw) && Math.abs(latRaw) <= 90 ? latRaw : undefined,
      longitude: !isNaN(lngRaw) && Math.abs(lngRaw) <= 180 ? lngRaw : undefined,
      hours,
      error: !kv['Grad'] || NOT_SET.test(kv['Grad'] || '') ? 'Nedostaje grad' : undefined,
    });
  }
  return items;
}

// ============================== LINIJA PARSER (LOKAL;... / DOGAĐAJ;...) ==============================
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
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      parts.push(value.trim());
      value = '';
    } else value += char;
  }
  parts.push(value.trim());
  return parts;
}

function parseLineFile(text: string, knownCities: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split(/\r?\n/);
  let first = true;

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) return;
    if (first && /naziv|name|title/i.test(line) && !/^(lok|ven|eve|doga)/i.test(line)) { first = false; return; }
    first = false;

    const parts = splitDelimitedLine(line);
    const prefix = parts[0].toLowerCase();

    if (prefix.startsWith('lok') || prefix.startsWith('ven')) {
      const [, name, address, city, description] = parts;
      items.push({
        kind: 'VENUE', line: idx + 1, name, address: address || '',
        city: normalizeCity(city || '', knownCities), description: description || '',
        hours: null,
        error: (!name || !city) ? 'Nedostaju naziv ili grad' : undefined,
      });
    } else if (prefix.startsWith('doga') || prefix.startsWith('eve')) {
      const [, title, venueName, city, date, time, category, price, description] = parts;
      const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date || '') || /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(date || '');
      items.push({
        kind: 'EVENT', line: idx + 1, title, venueName, city, date, time, category, price, description,
        error: !dateOk ? 'Datum mora biti YYYY-MM-DD ili DD.MM.YYYY' : (!title || !venueName ? 'Nedostaju naslov ili lokal' : undefined),
      });
    } else {
      items.push({ kind: 'VENUE', line: idx + 1, error: `Nepoznat tip "${parts[0]}" — počni liniju sa LOKAL ili DOGAĐAJ` });
    }
  });
  return items;
}

function parseImport(text: string, knownCities: string[]): ParsedItem[] {
  if (/LOKAL\s*#\d+/.test(text) || /^Ime\s*:/m.test(text)) return parseBlockFile(text, knownCities);
  return parseLineFile(text, knownCities);
}

// ============================== STRANICA ==============================
export default function ImportPage() {
  const [role, setRole] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'wizard' | 'done'>('upload');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState('');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [itemError, setItemError] = useState('');

  const [edit, setEdit] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<HoursMap | null>(null);
  const [existing, setExisting] = useState<null | {
    id: string; imageUrl: string | null; openingHours: unknown[]; tags: { name: string }[];
    latitude?: number | null; longitude?: number | null; address?: string | null; phone?: string | null;
    website?: string | null; instagramUrl?: string | null; facebookUrl?: string | null; tiktokUrl?: string | null;
    description?: string | null; city?: string | null; [k: string]: unknown;
  }>(null);

  const [venues, setVenues] = useState<{ id: string; name: string; city: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRole(d?.user?.role || 'guest'))
      .catch(() => setRole('guest'));
    fetch('/api/venues?limit=500')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setVenues(Array.isArray(d) ? d.map((v: any) => ({ id: v.id, name: v.name, city: v.city })) : []))
      .catch(() => {});
  }, []);

  const knownCities = Array.from(new Set([...SUPPORTED_CITIES.map((c) => c.name), ...venues.map((v) => v.city).filter(Boolean)]));

  const startParse = (text: string, name?: string) => {
    const parsed = parseImport(text, knownCities);
    if (parsed.length === 0) return;
    setQueue(parsed.map((p) => ({ ...p, status: p.error ? 'error' : 'pending' })));
    setFileName(name || 'lijepljeni tekst');
    setStep('review');
  };

  const onFile = async (f: File) => {
    const text = await f.text();
    startParse(text, f.name);
  };

  const loadItem = async (idx: number) => {
    const q = queue[idx];
    setCurrent(idx);
    setImageUrl(null);
    setItemError('');
    setExisting(null);
    setHours(q.hours ? { ...q.hours } : null);
    setEdit(
      q.kind === 'VENUE'
        ? {
            name: q.name || '', address: q.address || '', city: q.city || '', phone: q.phone || '',
            website: q.website || '', instagramUrl: q.instagramUrl || '', facebookUrl: q.facebookUrl || '',
            tiktokUrl: q.tiktokUrl || '', description: q.description || '', tip: q.tip || '',
          }
        : { title: q.title || '', venueName: q.venueName || '', city: q.city || '', date: q.date || '', time: q.time || '20:00', category: q.category || 'PARTY', price: q.price || '', description: q.description || '', venueId: '' }
    );

    // da li lokal već postoji u bazi? → prikaz samo podataka koji FALE
    if (q.kind === 'VENUE' && q.name) {
      setLookingUp(true);
      try {
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'lookup', name: q.name, city: q.city }),
        });
        const data = await res.json();
        if (res.ok && data.venue) setExisting(data.venue);
      } catch { /* nastavi kao novi unos */ }
      finally { setLookingUp(false); }
    }
  };

  const beginWizard = () => {
    const firstPending = queue.findIndex((q) => q.status === 'pending');
    loadItem(firstPending >= 0 ? firstPending : 0);
    setStep('wizard');
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
    if (next >= 0) loadItem(next);
    else setStep('done');
  };

  /** Polja lokala koja FALЕ u bazi (update režim) — samo njih prikazujemo */
  const VENUE_FIELDS: { key: string; label: string }[] = [
    { key: 'address', label: 'Adresa' },
    { key: 'city', label: 'Grad' },
    { key: 'phone', label: 'Telefon' },
    { key: 'website', label: 'Website' },
    { key: 'instagramUrl', label: 'Instagram' },
    { key: 'facebookUrl', label: 'Facebook' },
    { key: 'tiktokUrl', label: 'TikTok' },
    { key: 'description', label: 'Opis' },
  ];

  const saveCurrent = async () => {
    const q = queue[current];
    if (!q) return;
    setSaving(true);
    setItemError('');
    try {
      let payload: Record<string, unknown>;

      if (q.kind === 'VENUE') {
        const isUpdate = !!existing;
        const data: Record<string, unknown> = {};
        if (isUpdate) {
          for (const f of VENUE_FIELDS) {
            const dbVal = String((existing as Record<string, unknown>)[f.key] ?? '');
            if (dbVal === '' && edit[f.key]?.trim()) data[f.key] = edit[f.key].trim();
          }
          if (existing.openingHours.length === 0 && hours) {
            data.openingHours = DAY_GROUPS.map((g) => ({ dayGroup: g.key, ...hours[g.key] }));
          }
          if (edit.tip && !existing.tags.some((t) => t.name.toLowerCase() === edit.tip.toLowerCase())) data.tags = [edit.tip];
          if (q.latitude !== undefined && existing.latitude == null) data.latitude = q.latitude;
          if (q.longitude !== undefined && existing.longitude == null) data.longitude = q.longitude;
          payload = { type: 'VENUE', mode: 'update', id: existing.id, imageUrl, data };
        } else {
          Object.assign(data, {
            name: edit.name, address: edit.address || 'Nepoznata adresa', city: edit.city,
            phone: edit.phone, website: edit.website, instagramUrl: edit.instagramUrl,
            facebookUrl: edit.facebookUrl, tiktokUrl: edit.tiktokUrl, description: edit.description,
          });
          if (q.latitude !== undefined) data.latitude = q.latitude;
          if (q.longitude !== undefined) data.longitude = q.longitude;
          if (edit.tip) data.tags = [edit.tip];
          if (hours) data.openingHours = DAY_GROUPS.map((g) => ({ dayGroup: g.key, ...hours[g.key] }));
          payload = { type: 'VENUE', mode: 'create', imageUrl, data };
        }
      } else {
        payload = {
          type: 'EVENT',
          imageUrl,
          data: {
            title: edit.title, venueId: edit.venueId || undefined, venueName: edit.venueName, city: edit.city,
            date: edit.date, time: edit.time, category: edit.category, price: edit.price, description: edit.description,
          },
        };
      }

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (q.kind === 'VENUE' && data.venue && !existing) {
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
    setQueue([]); setCurrent(0); setPasted(''); setFileName(''); setImageUrl(null); setExisting(null); setHours(null); setStep('upload');
  };

  if (role === null) {
    return <div className="p-4 md:p-8 text-center animate-pulse text-muted uppercase text-xs font-black tracking-widest">Učitavanje…</div>;
  }
  if (role !== 'ADMIN') {
    return (
      <div className="p-4 md:p-8">
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

  // koja polja prikazati za lokal
  const isUpdate = !!existing && q?.kind === 'VENUE';
  const visibleFields = !isUpdate
    ? VENUE_FIELDS
    : VENUE_FIELDS.filter((f) => String((existing as Record<string, unknown>)[f.key] ?? '') === '' && edit[f.key]?.trim());
  const showHours = q?.kind === 'VENUE' && hours && (!isUpdate || existing.openingHours.length === 0);
  const showImage = q?.kind === 'VENUE' && (!isUpdate || !existing.imageUrl);
  const showCoords = q?.kind === 'VENUE' && q.latitude !== undefined && (!isUpdate || existing.latitude == null);
  const nothingToDo = isUpdate && visibleFields.length === 0 && !showHours && !showImage && !showCoords && !(edit.tip && !existing.tags.some((t) => t.name.toLowerCase() === edit.tip?.toLowerCase()));

  const matchedVenue = q?.kind === 'EVENT' ? venues.find((v) => v.name.toLowerCase() === (edit.venueName || '').toLowerCase()) : undefined;

  const inputCls = 'w-full h-12 bg-surface border border-border rounded-xl px-4 text-sm font-medium text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-[10px] font-bold text-muted uppercase tracking-widest mb-2';
  const timeCls = 'w-full h-10 bg-surface border border-border rounded-lg px-3 text-sm font-mono text-white focus:outline-none focus:border-primary transition-colors';

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
            <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Ubaci izvještaj / CSV / TXT fajl</p>
            <p className="text-muted text-sm">klikni za izbor fajla (ili ubaci tekst ispod)</p>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-4">
            <p className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
              <FileText size={16} className="text-primary" /> Ili zalijepi tekst
            </p>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={6}
              placeholder={EXAMPLE_BLOCK}
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
            <p className="text-white font-black uppercase tracking-widest text-xs mb-4">Podržana su dva formata</p>
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">1. Izvještaj (LOKAL #1, Ime:, RADNO VRIJEME…)</p>
            <pre className="bg-surface border border-border rounded-xl p-4 text-xs font-mono text-muted overflow-x-auto scrollbar-hide leading-relaxed mb-4">{EXAMPLE_BLOCK}</pre>
            <p className="text-xs font-bold text-white uppercase tracking-widest mb-2">2. Linije</p>
            <pre className="bg-surface border border-border rounded-xl p-4 text-xs font-mono text-muted overflow-x-auto scrollbar-hide leading-relaxed">{EXAMPLE_LINE}</pre>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>• Format se prepoznaje automatski · "Nije navedeno" se preskače</li>
              <li>• Radno vrijeme: 07-00 = 07:00–00:00 · Zatvoreno = zatvoren dan · koordinate se čitaju automatski</li>
              <li>• Ako lokal već postoji u bazi, prikazuju se SAMO podaci koji fale</li>
              <li>• Naslovna slika se dodaje u čarobnjaku i nije obavezna</li>
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
                  <p className="text-sm font-bold text-white truncate">{item.error ? (item.line ? `Linija ${item.line}` : 'Blok') : (item.name || item.title)}</p>
                  <p className="text-xs text-muted truncate">
                    {item.error ? <span className="text-red-400">{item.error}</span> : item.kind === 'VENUE' ? `Lokal · ${item.city}${item.tip ? ` · ${item.tip}` : ''}` : `${item.date} ${item.time} · ${item.venueName}`}
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
            {/* ======= LOKAL ======= */}
            {q.kind === 'VENUE' && (
              <>
                {lookingUp ? (
                  <p className="text-sm text-muted flex items-center gap-2"><Loader2 size={16} className="animate-spin text-primary" /> Provjera da li lokal već postoji u bazi…</p>
                ) : isUpdate ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-start gap-3">
                    <Info size={18} className="text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-white">Lokal već postoji u bazi</p>
                      <p className="text-xs text-muted mt-1">Prikazani su samo podaci koji nisu uneseni. Ostalo se ne mijenja.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xl font-black text-white">{edit.name}</p>
                )}

                {isUpdate && !lookingUp && (
                  <p className="text-sm font-bold text-white">{edit.name}</p>
                )}

                {nothingToDo && (
                  <p className="text-sm text-muted bg-elevated border border-border rounded-2xl p-4">
                    Svi podaci iz fajla su već unešeni za ovaj lokal — možeš samo preskočiti.
                  </p>
                )}

                {!lookingUp && (visibleFields.length > 0 || !isUpdate) && (
                  <>
                    {!isUpdate && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div><label className={labelCls}>Naziv</label><input className={inputCls} value={edit.name || ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
                        <div><label className={labelCls}>Grad</label><input className={inputCls} value={edit.city || ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></div>
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {visibleFields.map((f) => (
                        <div key={f.key}>
                          <label className={labelCls}>{f.label}{isUpdate ? ' (fali u bazi)' : ''}</label>
                          <input className={inputCls} value={edit[f.key] || ''} onChange={(e) => setEdit({ ...edit, [f.key]: e.target.value })} />
                        </div>
                      ))}
                    </div>
                    {!isUpdate && (
                      <div><label className={labelCls}>Tip lokala (tag)</label><input className={inputCls} placeholder="Pub" value={edit.tip || ''} onChange={(e) => setEdit({ ...edit, tip: e.target.value })} /></div>
                    )}
                    {isUpdate && edit.tip && !existing.tags.some((t) => t.name.toLowerCase() === edit.tip.toLowerCase()) && (
                      <p className="text-xs text-muted">Tag "<span className="text-white font-bold">{edit.tip}</span>" će biti dodat.</p>
                    )}
                    {showCoords && (
                      <p className="text-xs text-muted">Koordinate se unose automatski: <span className="text-white font-mono">{q.latitude?.toFixed(5)}, {q.longitude?.toFixed(5)}</span></p>
                    )}
                  </>
                )}

                {/* RADNO VRIJEME */}
                {showHours && hours && (
                  <div className="bg-elevated border border-border rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">
                      Radno vrijeme {isUpdate ? '(fali u bazi)' : ''}
                    </p>
                    {DAY_GROUPS.map((g) => (
                      <div key={g.key} className="flex items-center gap-3">
                        <p className="text-xs font-bold text-white w-36 shrink-0">{g.label}</p>
                        <input className={timeCls} placeholder="07:00" value={hours[g.key].open} disabled={hours[g.key].closed}
                          onChange={(e) => setHours({ ...hours, [g.key]: { ...hours[g.key], open: e.target.value } })} />
                        <span className="text-muted text-xs">–</span>
                        <input className={timeCls} placeholder="00:00" value={hours[g.key].close} disabled={hours[g.key].closed}
                          onChange={(e) => setHours({ ...hours, [g.key]: { ...hours[g.key], close: e.target.value } })} />
                        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer shrink-0">
                          <input type="checkbox" checked={hours[g.key].closed} className="accent-primary"
                            onChange={(e) => setHours({ ...hours, [g.key]: { ...hours[g.key], closed: e.target.checked } })} />
                          Zatvoreno
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ======= DOGAĐAJ ======= */}
            {q.kind === 'EVENT' && (
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
            {showImage && (
              <div className="bg-elevated border border-border rounded-2xl p-5 space-y-4">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon size={14} className="text-primary" /> Naslovna slika {isUpdate ? '(fali u bazi)' : '(nije obavezna)'}
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
            )}

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
                disabled={saving || uploading || nothingToDo}
                className="h-14 flex-1 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isUpdate ? 'Dopuni i nastavi' : 'Sačuvaj i nastavi'}
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
