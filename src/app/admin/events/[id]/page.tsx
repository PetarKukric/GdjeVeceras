'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  ArrowLeft, 
  Save, 
  Image as ImageIcon,
  Calendar,
  Clock,
  Tag,
  Shirt,
  Trash2,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Venue } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { toISOFromLocalInput, toLocalDatetimeValue } from '@/lib/bosnia-time';
import { ImageUploader } from '@/components/admin/ImageUploader';

export default function EditEvent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [eventFinished, setEventFinished] = useState(false);
  const [additionalVenueIds, setAdditionalVenueIds] = useState<string[]>([]);
  // ===== Ponavljajući događaj / pojedinačni termin =====
  const [occDate, setOccDate] = useState<string | null>(null);
  const [occCancelled, setOccCancelled] = useState(false);
  const [occBusy, setOccBusy] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'DAILY'>('WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [noRecurrenceEnd, setNoRecurrenceEnd] = useState(true);
  const [recError, setRecError] = useState('');

  const toggleRecDay = (day: number) => {
    setRecurrenceDays(recurrenceDays.includes(day) ? recurrenceDays.filter((d) => d !== day) : [...recurrenceDays, day].sort((a, b) => a - b));
  };

  const validateRecurrence = (): boolean => {
    if (!isRecurring) { setRecError(''); return true; }
    if (recurrenceType === 'WEEKLY' && recurrenceDays.length === 0) {
      setRecError('Odaberite barem jedan dan ponavljanja.'); return false;
    }
    const start = recurrenceStart || formData.startDateTime.slice(0, 10);
    if (!start) { setRecError('Postavite datum početka.'); return false; }
    if (!noRecurrenceEnd && recurrenceEnd && recurrenceEnd < start) {
      setRecError('Datum završetka ne može biti prije početka.'); return false;
    }
    setRecError('');
    return true;
  };

  const handleOccurrenceAction = async (action: 'cancel' | 'restore') => {
    if (!occDate) return;
    if (action === 'cancel' && !confirm('Otkazati SAMO termin ' + occDate + '? Serija ostaje aktivna za ostale datume.')) return;
    setOccBusy(true);
    try {
      const res = await fetch('/api/admin/events/' + id + '/occurrence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occurrenceDate: occDate, action }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Gotovo');
        setOccCancelled(action === 'cancel');
      } else {
        alert('Greška: ' + data.error);
      }
    } catch {
      alert('Mrežna greška.');
    } finally {
      setOccBusy(false);
    }
  };

  const [eventSlug, setEventSlug] = useState('');
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PARTY',
    venueId: '',
    startDateTime: '',
    endDateTime: '',
    price: 0,
    currency: 'KM',
    imageUrl: '',
    performers: '',
    minimumAge: '',
    dressCodeType: 'NONE',
    dressCodeName: '',
    dressCodeDescription: '',
    ticketUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    status: 'PUBLISHED'
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [venuesRes, eventRes] = await Promise.all([
          fetch('/api/venues'),
          fetch(`/api/admin/events?id=${id}`) // We need a way to fetch a single event by ID for admin
        ]);
        
        const venuesData = await venuesRes.json();
        setVenues(venuesData);

        // For now, let's assume we fetch all and find, but better to have specific API
        const allEvents = await eventRes.json();
        const event = allEvents.find((e: any) => e.id === id);
        
        if (event) {
          setEventSlug(event.slug || '');
          // datum termina iz URL-a (?date=YYYY-MM-DD)
          const dParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('date') : null;
          setOccDate(dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam) ? dParam : null);
          // recurrence prefill
          setIsRecurring(!!event.isRecurring);
          setRecurrenceType(event.recurrenceType === 'DAILY' ? 'DAILY' : 'WEEKLY');
          try { setRecurrenceDays(event.recurrenceDays ? JSON.parse(event.recurrenceDays) : []); } catch { setRecurrenceDays([]); }
          setRecurrenceStart(event.recurrenceStart ? toLocalDatetimeValue(new Date(event.recurrenceStart)).slice(0, 10) : '');
          setRecurrenceEnd(event.recurrenceEnd ? toLocalDatetimeValue(new Date(event.recurrenceEnd)).slice(0, 10) : '');
          setNoRecurrenceEnd(!event.recurrenceEnd);
          // ako uređujemo JEDAN termin — dohvati ga (primjenjuje izuzetke)
          if (dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam)) {
            const occRes = await fetch('/api/events/' + event.slug + '?date=' + dParam);
            if (occRes.ok) {
              const occData = await occRes.json();
              const occ = occData.event;
              setFormData((f) => ({
                ...f,
                title: occ.title || f.title,
                startDateTime: occ.startDateTime ? toLocalDatetimeValue(new Date(occ.startDateTime)) : f.startDateTime,
                endDateTime: occ.endDateTime ? toLocalDatetimeValue(new Date(occ.endDateTime)) : f.endDateTime,
              }));
              setOccCancelled(false);
            } else {
              setOccCancelled(true);
            }
          }
          setEventFinished(!!event.endDateTime && new Date(event.endDateTime) < new Date());
          setAdditionalVenueIds((event.additionalVenues || []).map((av: any) => av.venueId));
          setFormData({
            title: event.title || '',
            description: event.description || '',
            category: event.category || 'PARTY',
            venueId: event.venueId || '',
            // Lokalno vrijeme za input (a ne UTC isječak)
            startDateTime: event.startDateTime ? toLocalDatetimeValue(new Date(event.startDateTime)) : '',
            endDateTime: event.endDateTime ? toLocalDatetimeValue(new Date(event.endDateTime)) : '',
            price: event.price || 0,
            currency: event.currency || 'KM',
            imageUrl: event.imageUrl || '',
            performers: event.performers || '',
            minimumAge: event.minimumAge?.toString() || '',
            dressCodeType: event.dressCodeType || 'NONE',
            dressCodeName: event.dressCodeName || '',
            dressCodeDescription: event.dressCodeDescription || '',
            ticketUrl: event.ticketUrl || '',
            instagramUrl: event.instagramUrl || '',
            facebookUrl: event.facebookUrl || '',
            status: event.status || 'PUBLISHED'
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ===== SAMO JEDAN TERMIN =====
    if (occDate) {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/events/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editOccurrenceOnly: true,
            occurrenceDate: occDate,
            title: formData.title,
            performers: formData.performers,
            startDateTime: toISOFromLocalInput(formData.startDateTime),
            endDateTime: formData.endDateTime ? toISOFromLocalInput(formData.endDateTime) : undefined,
          }),
        });
        if (res.ok) {
          showToast('Termin izmijenjen');
          router.push('/admin/events');
        } else {
          const error = await res.json();
          alert('Greška: ' + error.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateRecurrence()) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDateTime: toISOFromLocalInput(formData.startDateTime),
          endDateTime: formData.endDateTime ? toISOFromLocalInput(formData.endDateTime) : undefined,
          additionalVenueIds,
          price: parseFloat(formData.price.toString()),
          // Ponavljajući događaj — pravilo
          isRecurring,
          ...(isRecurring ? {
            recurrenceType,
            ...(recurrenceType === 'WEEKLY' ? { recurrenceDays } : {}),
            recurrenceStart: (recurrenceStart || formData.startDateTime.slice(0, 10)) + 'T00:00',
            ...(noRecurrenceEnd || !recurrenceEnd
              ? { noRecurrenceEnd: true }
              : { recurrenceEnd: recurrenceEnd + 'T23:59' }),
          } : {}),
        }),
      });

      if (res.ok) {
        showToast('Izmjene sačuvane');
        router.push('/admin/events');
      } else {
        const error = await res.json();
        alert('Greška: ' + error.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isRecurring) {
      if (!confirm('PAŽNJA: Ovo briše CIJELU SERIJU ponavljajućeg događaja (sve termine i rezervacije). Nastaviti?')) return;
    } else {
      if (!confirm('Da li ste sigurni da želite obrisati ovaj događaj?')) return;
    }
    try {
      const res = await fetch(`/api/events/${eventSlug}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Događaj obrisan');
        router.push('/admin/events');
      } else {
        alert('Greška pri brisanju.');
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  if (fetching) return <div className="p-12 text-center animate-pulse">Učitavanje podataka...</div>;

  // Završeni događaji se ne mogu uređivati — samo obrisati
  if (eventFinished) {
    return (
      <>
        <AdminHeader title="Događaj je završen" />
        <main className="p-4 md:p-8 max-w-3xl mx-auto text-left">
          <Link href="/admin/events" className="inline-flex items-center gap-2 text-muted hover:text-text mb-8 text-sm font-bold transition-colors">
            <ArrowLeft size={16} /> Nazad na listu
          </Link>
          <div className="bg-card border border-white/5 rounded-3xl p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gray-500/10 border border-gray-500/20 flex items-center justify-center text-gray-400 mx-auto">
              <Clock size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">Događaj je završen</h3>
            <p className="text-muted text-xs font-bold uppercase tracking-widest leading-relaxed max-w-md mx-auto">
              Ovaj događaj je prošao i više ga nije moguće uređivati. Možete ga samo obrisati sa platforme.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/admin/events" className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Nazad
              </Link>
              <button onClick={handleDelete} className="px-8 py-3.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <Trash2 size={14} /> Obriši događaj
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Uredi događaj" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto text-left">
        <Link href="/admin/events" className="inline-flex items-center gap-2 text-muted hover:text-text mb-8 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Nazad na listu
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Tag size={18} /> Osnovne informacije
                 </h3>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Naziv događaja *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Opis</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm min-h-[120px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Kategorija</label>
                          <select 
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          >
                             <option value="PARTY">Žurka</option>
                             <option value="LIVE_MUSIC">Muzika uživo</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Lokal (Venue) *</label>
                          <select 
                            required
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                            value={formData.venueId}
                            onChange={(e) => {
                              setFormData({ ...formData, venueId: e.target.value });
                              setAdditionalVenueIds(prev => prev.filter(id => id !== e.target.value));
                            }}
                          >
                             {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                          {(() => {
                            const v = venues.find(v => v.id === formData.venueId);
                            return v ? (
                              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                <MapPin size={12} /> Grad: {v.city || '—'}
                              </p>
                            ) : null;
                          })()}
                       </div>

                       {venues.length > 1 && (
                         <div>
                            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Zajednički događaj — dodatni lokali (opciono)</label>
                            <div className="max-h-44 overflow-y-auto pr-1 space-y-1.5 border border-border rounded-xl p-3 bg-surface/50">
                              {venues.filter(v => v.id !== formData.venueId).map(v => {
                                const checked = additionalVenueIds.includes(v.id);
                                return (
                                  <label key={v.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${checked ? 'bg-primary/10 border border-primary/30' : 'border border-transparent hover:bg-white/5'}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        setAdditionalVenueIds(prev =>
                                          e.target.checked ? [...prev, v.id] : prev.filter(id => id !== v.id)
                                        );
                                      }}
                                      className="accent-pink-500 w-4 h-4 shrink-0"
                                    />
                                    <span className="text-xs font-bold text-white">{v.name}</span>
                                    {v.city && <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{v.city}</span>}
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-muted font-medium mt-1.5">Ako se događaj održava u više lokala istovremeno — označi sve. Tretiraće se kao jedan zajednički događaj.</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                  <Tag size={18} /> Izvođač i ulaz
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Izvođač / DJ</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      placeholder="Npr. DJ Marko, Top orkestar"
                      value={formData.performers}
                      onChange={(e) => setFormData({ ...formData, performers: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Minimalna dob</label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                      placeholder="Npr. 18"
                      value={formData.minimumAge}
                      onChange={(e) => setFormData({ ...formData, minimumAge: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Calendar size={18} /> Vrijeme i cijena
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Početak *</label>
                      <input 
                        type="datetime-local" 
                        required
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.startDateTime}
                        onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Kraj (opciono)</label>
                      <input 
                        type="datetime-local" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.endDateTime}
                        onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Cijena</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Valuta</label>
                      <select
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      >
                        <option value="KM">KM</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Shirt size={18} /> Dress Code
                 </h3>
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Tip Dress Code-a</label>
                          <select 
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                            value={formData.dressCodeType}
                            onChange={(e) => setFormData({ ...formData, dressCodeType: e.target.value })}
                          >
                             <option value="NONE">Nema Dress Code-a</option>
                             <option value="CASUAL">Casual</option>
                             <option value="ELEGANT">Elegantno</option>
                             <option value="SPECIAL">Specijalni Dress Code</option>
                          </select>
                       </div>
                       {formData.dressCodeType === 'SPECIAL' && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                             <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Naziv Dress Code-a *</label>
                             <input 
                               type="text" 
                               required
                               className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                               placeholder="Npr. All White, Masquerade..."
                               value={formData.dressCodeName}
                               onChange={(e) => setFormData({ ...formData, dressCodeName: e.target.value })}
                             />
                          </div>
                       )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Opis Dress Code-a (opciono)</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm min-h-[80px]"
                        placeholder="Detaljnije upute za goste..."
                        value={formData.dressCodeDescription}
                        onChange={(e) => setFormData({ ...formData, dressCodeDescription: e.target.value })}
                      />
                    </div>
                 </div>
              </div>
            </div>

            {/* ===== BANNER: uređivanje samo jednog termina ===== */}
            {occDate && (
              <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between lg:col-span-3">
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-widest">Uređuješ samo termin: {occDate}</p>
                  <p className="text-xs text-muted mt-1">Izmjene se odnose samo na ovaj datum — pravilo ponavljanja se ne mijenja.</p>
                  {occCancelled && <p className="text-xs text-red-400 font-bold mt-1">Ovaj termin je OTKAZAN — posjetioci ga ne vide dok ga ne vratiš.</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={"/admin/events/" + id} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-white">Uredi cijelu seriju</Link>
                  <button
                    type="button"
                    disabled={occBusy}
                    onClick={() => handleOccurrenceAction(occCancelled ? 'restore' : 'cancel')}
                    className={"px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 " + (occCancelled ? 'bg-primary text-white' : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white')}
                  >
                    {occCancelled ? 'Vrati termin' : 'Otkaži ovaj termin'}
                  </button>
                </div>
              </div>
            )}

            {/* ===== PONAVLJAJUĆI DOGAĐAJ (samo za seriju) ===== */}
            {!occDate && (
              <div className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
                <label className="flex items-center gap-3 cursor-pointer select-none" htmlFor="isRecurringCheck">
                  <input
                    id="isRecurringCheck"
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-5 h-5 accent-primary cursor-pointer"
                  />
                  <span className="text-sm font-black uppercase tracking-widest text-white">Ponavljajući događaj</span>
                </label>
                {isRecurring && (
                  <div className="space-y-5 pt-2 animate-fade-up">
                    <div>
                      <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Ponavljanje</p>
                      <div className="flex flex-wrap gap-2">
                        {[['WEEKLY', 'Svake sedmice'], ['DAILY', 'Svaki dan']].map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setRecurrenceType(val as 'WEEKLY' | 'DAILY')}
                            className={"px-5 h-11 rounded-xl text-xs font-black uppercase tracking-widest border transition-all " + (recurrenceType === val ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-border hover:text-white')}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {recurrenceType === 'WEEKLY' && (
                      <div>
                        <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Dani</p>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                          {[['PON', 1], ['UT', 2], ['SRI', 3], ['ČET', 4], ['PET', 5], ['SUB', 6], ['NED', 0]].map(([label, val]) => (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() => toggleRecDay(val as number)}
                              aria-pressed={recurrenceDays.includes(val as number)}
                              className={"h-11 rounded-xl text-[11px] font-black border transition-all " + (recurrenceDays.includes(val as number) ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-border hover:text-white')}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Početak</label>
                        <input
                          type="date"
                          value={recurrenceStart}
                          onChange={(e) => setRecurrenceStart(e.target.value)}
                          className="w-full h-11 px-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Završetak</label>
                        <input
                          type="date"
                          value={recurrenceEnd}
                          disabled={noRecurrenceEnd}
                          onChange={(e) => setRecurrenceEnd(e.target.value)}
                          className="w-full h-11 px-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm disabled:opacity-40"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noRecurrenceEnd}
                        onChange={(e) => setNoRecurrenceEnd(e.target.checked)}
                        className="w-4 h-4 accent-primary cursor-pointer"
                      />
                      <span className="text-xs font-bold text-muted uppercase tracking-widest">Bez datuma završetka</span>
                    </label>
                    {recError && <p className="text-xs font-bold text-red-400" role="alert">{recError}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <ImageIcon size={18} /> Slika, status i linkovi
                 </h3>
                 <div className="space-y-4 pt-4">
                    <ImageUploader
                      label="Naslovna slika događaja"
                      value={formData.imageUrl}
                      onChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                      aspect="video"
                    />
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 text-left">Status</label>
                      <select 
                        className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                         <option value="PUBLISHED">Objavljeno</option>
                         <option value="PENDING">Na čekanju</option>
                         <option value="CANCELLED">Otkazano</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 text-left">Link za ulaznice</label>
                      <input type="url" value={formData.ticketUrl} onChange={(e) => setFormData({ ...formData, ticketUrl: e.target.value })} placeholder="https://..." className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 text-left">Instagram link</label>
                      <input type="url" value={formData.instagramUrl} onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })} placeholder="https://instagram.com/..." className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2 text-left">Facebook link</label>
                      <input type="url" value={formData.facebookUrl} onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })} placeholder="https://facebook.com/..." className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm" />
                    </div>
                 </div>
              </div>

              <div className="sticky top-24 space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-text font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Save size={20} /> {loading ? 'ČUVANJE...' : 'SNIMI IZMJENE'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
