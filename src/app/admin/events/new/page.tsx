'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  ArrowLeft, 
  Save, 
  Image as ImageIcon,
  Calendar,
  Tag,
  Shirt,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Venue } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { toISOFromLocalInput } from '@/lib/bosnia-time';
import { ImageUploader } from '@/components/admin/ImageUploader';

export default function NewEvent() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PARTY',
    venueId: '',
    startDateTime: '',
    endDateTime: '',
    price: 0,
    imageUrl: '',
    performers: '',
    minimumAge: '',
    dressCodeType: 'NONE',
    dressCodeName: '',
    dressCodeDescription: '',
    ticketUrl: '',
    instagramUrl: '',
    facebookUrl: '',
  });
  const [additionalVenueIds, setAdditionalVenueIds] = useState<string[]>([]);
  // ===== Ponavljajući događaj =====
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


  useEffect(() => {
    async function fetchVenues() {
      // Fetch user session to know their role/owned venues
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      const res = await fetch('/api/venues');
      let data = await res.json();
      
      // Filter if owner
      if (session.user.role === 'OWNER') {
        data = data.filter((v: Venue) => v.ownerId === session.user.id);
      }

      setVenues(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, venueId: data[0].id }));
    }
    fetchVenues();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Basic validation
      if (!formData.title || !formData.venueId || !formData.startDateTime) {
        alert('Molimo popunite obavezna polja (Naziv, Lokal, Vreme).');
        return;
      }

      if (!validateRecurrence()) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Vrijeme: lokalno vrijeme iz inputa → ISO (UTC) da se ne pomjeri dan
          startDateTime: toISOFromLocalInput(formData.startDateTime),
          endDateTime: formData.endDateTime ? toISOFromLocalInput(formData.endDateTime) : undefined,
          additionalVenueIds,
          price: parseFloat(formData.price.toString()),
          createdById: 'admin-id', // In real app, get from session
          status: 'PUBLISHED', // Admin created events can be published immediately
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
        showToast('Događaj uspješno kreiran');
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

  return (
    <>
      <AdminHeader title="Novi događaj" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <Link href="/admin/events" className="inline-flex items-center gap-2 text-muted hover:text-text mb-8 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Nazad na listu
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Info */}
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
                        placeholder="Npr. Techno Invasion"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Opis</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm min-h-[120px]"
                        placeholder="Detalji o događaju..."
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
                             <option value="CONCERT">Koncert</option>
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
                            <p className="text-[10px] text-muted font-medium mt-1.5">Ako se žurka održava u više lokala istovremeno (npr. Makao i Kamel) — označi sve. Tretiraće se kao jedan zajednički događaj.</p>
                         </div>
                       )}
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
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Cijena (KM)</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      />
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <ImageIcon size={18} /> Dodatno
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Izvođači</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="DJ, Bend..."
                        value={formData.performers}
                        onChange={(e) => setFormData({ ...formData, performers: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Minimum godina</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="18"
                        value={formData.minimumAge}
                        onChange={(e) => setFormData({ ...formData, minimumAge: e.target.value })}
                      />
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

              {/* ===== PONAVLJAJUĆI DOGAĐAJ (progressive disclosure) ===== */}
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

            {/* Sidebar Form */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <ImageIcon size={18} /> Slika i linkovi
                 </h3>
                 <div className="space-y-4 pt-4">
                    <ImageUploader
                      label="Naslovna slika događaja (opciono)"
                      value={formData.imageUrl}
                      onChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                      aspect="video"
                    />
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Link za karte</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="Gigstix link..."
                        value={formData.ticketUrl}
                        onChange={(e) => setFormData({ ...formData, ticketUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Instagram link</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      />
                    </div>
                 </div>
              </div>

              <div className="sticky top-24 space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-text font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Save size={20} /> {loading ? 'ČUVANJE...' : 'OBJAVI DOGAĐAJ'}
                </button>
                <Link href="/admin/events" className="block w-full py-4 bg-surface border border-border text-muted font-bold rounded-2xl text-center hover:text-text transition-all text-sm uppercase tracking-widest">
                  Otkaži
                </Link>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
