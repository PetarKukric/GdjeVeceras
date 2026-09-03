'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  ArrowLeft, 
  Save, 
  Image as ImageIcon,
  MapPin,
  Phone,
  Info,
  CalendarCheck,
  Clock,
  Tag,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { isValidBosnianPhone } from '@/lib/validation';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { ImageUploader } from '@/components/admin/ImageUploader';

const PREDEFINED_TAGS = [
  'Parking', 'Bingo', 'Wi-Fi', 'Terasa', 'Bašta', 'Rezervacije', 'Hrana', 
  'Kokteli', 'Bilijar', 'Pikado', 'TV', 'Sportski prenosi', 
  'Pristup za osobe sa invaliditetom', 'Garderoba', 'VIP', 
  'Live muzika', 'Plesni podij', 'Klima'
];

type OpeningHourForm = { dayGroup: string; openTime: string; closeTime: string; isClosed: boolean };
const INDIVIDUAL_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];
const HOUR_LABELS: Record<string, string> = {
  WEEKDAYS: 'Radni dani (Pon-Čet)', MONDAY: 'Ponedjeljak', TUESDAY: 'Utorak',
  WEDNESDAY: 'Srijeda', THURSDAY: 'Četvrtak', FRIDAY: 'Petak',
  SATURDAY: 'Subota', SUNDAY: 'Nedjelja'
};
const DEFAULT_HOURS: OpeningHourForm[] = [
  { dayGroup: 'WEEKDAYS', openTime: '08:00', closeTime: '23:00', isClosed: false },
  { dayGroup: 'FRIDAY', openTime: '08:00', closeTime: '02:00', isClosed: false },
  { dayGroup: 'SATURDAY', openTime: '10:00', closeTime: '03:00', isClosed: false },
  { dayGroup: 'SUNDAY', openTime: '10:00', closeTime: '22:00', isClosed: false },
];

export default function EditVenue() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [users, setUsers] = useState<{ id: string, name: string, email: string }[]>([]);
  const [customTag, setCustomTag] = useState('');
  const { showToast } = useToast();

  const [sameWeekdayHours, setSameWeekdayHours] = useState(true);
  const [openingHours, setOpeningHours] = useState<OpeningHourForm[]>(DEFAULT_HOURS);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    phone: '',
    website: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    imageUrl: '',
    ownerId: '',
    reservationsEnabled: false,
  });

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchVenue() {
      try {
        const res = await fetch(`/api/venues/${slug}`);
        if (!res.ok) {
          router.push('/admin/venues');
          return;
        }
        const data = await res.json();
        setFormData({
          name: data.name || '',
          description: data.description || '',
          address: data.address || '',
          city: data.city || '',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || '',
          phone: data.phone || '',
          website: data.website || '',
          instagramUrl: data.instagramUrl || '',
          facebookUrl: data.facebookUrl || '',
          tiktokUrl: data.tiktokUrl || '',
          imageUrl: data.imageUrl || '',
          ownerId: data.ownerId || '',
          reservationsEnabled: !!data.reservationsEnabled,
        });

        if (data.openingHours && data.openingHours.length > 0) {
          const hasIndividualWeekdays = data.openingHours.some((h: any) => INDIVIDUAL_WEEKDAYS.includes(h.dayGroup));
          setSameWeekdayHours(!hasIndividualWeekdays);
          const groups = hasIndividualWeekdays
            ? [...INDIVIDUAL_WEEKDAYS, 'FRIDAY', 'SATURDAY', 'SUNDAY']
            : ['WEEKDAYS', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
          const mappedHours = groups.map(dayGroup => {
            const group = DEFAULT_HOURS.find((hour) => hour.dayGroup === dayGroup)
              || { ...DEFAULT_HOURS[0], dayGroup };
            const existing = data.openingHours.find((h: any) => h.dayGroup === group.dayGroup);
            return existing ? {
              dayGroup: existing.dayGroup,
              openTime: existing.openTime,
              closeTime: existing.closeTime,
              isClosed: existing.isClosed
            } : group;
          });
          setOpeningHours(mappedHours);
        }

        if (data.tags) {
          setSelectedTags(data.tags.map((t: any) => t.name));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    fetchVenue();
  }, [slug, router]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleHourChange = (index: number, field: string, value: any) => {
    const newHours = [...openingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setOpeningHours(newHours);
  };

  const toggleSameWeekdayHours = (checked: boolean) => {
    setSameWeekdayHours(checked);
    setOpeningHours((current) => {
      if (checked) {
        const first = current.find((hour) => INDIVIDUAL_WEEKDAYS.includes(hour.dayGroup)) || current[0];
        return [
          { ...first, dayGroup: 'WEEKDAYS' },
          ...current.filter((hour) => !INDIVIDUAL_WEEKDAYS.includes(hour.dayGroup) && hour.dayGroup !== 'WEEKDAYS'),
        ];
      }
      const shared = current.find((hour) => hour.dayGroup === 'WEEKDAYS') || current[0];
      return [
        ...INDIVIDUAL_WEEKDAYS.map((dayGroup) => ({ ...shared, dayGroup })),
        ...current.filter((hour) => hour.dayGroup !== 'WEEKDAYS'),
      ];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (formData.phone && !isValidBosnianPhone(formData.phone)) {
        alert('Unesite ispravan broj telefona (npr. +387 66 123 456 ili 066 123 456).');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/venues/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
          openingHours,
          tags: selectedTags
        }),
      });

      if (res.ok) {
        showToast('Izmjene sačuvane');
        router.push('/admin/venues');
        router.refresh();
      } else {
        const error = await res.json();
        alert('Greška: ' + error.error);
      }
    } catch (err) {
      console.error(err);
      alert('Došlo je do greške pri čuvanju.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-4 md:p-8 text-center animate-pulse uppercase font-black tracking-widest">Učitavanje podataka...</div>;
  }

  return (
    <>
      <AdminHeader title="Uredi lokal" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-up">
        <Link href="/admin/venues" className="inline-flex items-center gap-2 text-muted hover:text-text mb-8 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Nazad na listu
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Info size={18} /> Osnovne informacije
                 </h3>
                 <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Naziv lokala *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Opis</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm min-h-[120px] font-medium"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Grad *</label>
                          <select 
                            required
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm cursor-pointer"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          >
                            <option value="" disabled>Odaberi grad</option>
                            {SUPPORTED_CITIES.map(c => (
                              <option key={c.slug} value={c.name}>{c.name}</option>
                            ))}
                            {formData.city && !SUPPORTED_CITIES.some(c => c.name === formData.city) && (
                              <option value={formData.city}>{formData.city}</option>
                            )}
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Adresa *</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Clock size={18} /> Radno vrijeme
                 </h3>
                 <div className="space-y-6">
                    <label className="flex items-start gap-3 p-4 bg-surface/50 rounded-xl border border-border/50 cursor-pointer">
                       <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
                          checked={sameWeekdayHours}
                          onChange={(e) => toggleSameWeekdayHours(e.target.checked)}
                       />
                       <span>
                          <span className="block text-xs font-black uppercase tracking-widest">Isto radno vrijeme od ponedjeljka do četvrtka</span>
                          <span className="block mt-1 text-[11px] text-muted">Isključite ako neki radni dan ima drugačije vrijeme.</span>
                       </span>
                    </label>
                    {openingHours.map((group, index) => (
                       <div key={group.dayGroup} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface/50 rounded-xl border border-border/50">
                          <div className="min-w-[140px]">
                             <p className="text-xs font-black uppercase tracking-widest">
                                {HOUR_LABELS[group.dayGroup]}
                             </p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4">
                             <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                   type="checkbox" 
                                   className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
                                   checked={group.isClosed}
                                   onChange={(e) => handleHourChange(index, 'isClosed', e.target.checked)}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-primary transition-colors">Zatvoreno</span>
                             </label>

                             {!group.isClosed && (
                                <div className="flex items-center gap-2">
                                   <input 
                                      type="time" 
                                      className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-white"
                                      value={group.openTime || ''}
                                      onChange={(e) => handleHourChange(index, 'openTime', e.target.value)}
                                   />
                                   <span className="text-muted">→</span>
                                   <input 
                                      type="time" 
                                      className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:border-primary text-white"
                                      value={group.closeTime || ''}
                                      onChange={(e) => handleHourChange(index, 'closeTime', e.target.value)}
                                   />
                                </div>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Tag size={18} /> Pogodnosti / Tagovi
                 </h3>
                 <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                       {PREDEFINED_TAGS.map(tag => (
                          <button
                             key={tag}
                             type="button"
                             onClick={() => toggleTag(tag)}
                             className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                                selectedTags.includes(tag) 
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-surface border-border text-muted hover:border-primary/50'
                             }`}
                          >
                             {tag}
                          </button>
                       ))}
                       {selectedTags.filter(t => !PREDEFINED_TAGS.includes(t)).map(tag => (
                          <button
                             key={tag}
                             type="button"
                             onClick={() => toggleTag(tag)}
                             className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border bg-primary border-primary text-white shadow-lg shadow-primary/20 flex items-center gap-2"
                          >
                             {tag} <X size={12} />
                          </button>
                       ))}
                    </div>

                    <div className="flex gap-2">
                       <input 
                          type="text" 
                          placeholder="Dodaj sopstveni tag..."
                          className="flex-grow px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                          value={customTag}
                          onChange={(e) => setCustomTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                       />
                       <button 
                          type="button"
                          onClick={addCustomTag}
                          className="px-6 py-3 bg-surface border border-border hover:border-primary text-primary rounded-xl transition-all"
                       >
                          <Plus size={20} />
                       </button>
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <MapPin size={18} /> Koordinate
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Phone size={18} /> Kontakt
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Telefon</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Website</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Instagram URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Facebook URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.facebookUrl}
                        onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">TikTok URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                        value={formData.tiktokUrl}
                        onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                      />
                    </div>
                 </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <ImageIcon size={18} /> Fotografija
                 </h3>
                 <ImageUploader
                    label="Naslovna fotografija lokala"
                    aspect="square"
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                 />
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                 <div className="flex items-center justify-between gap-6">
                    <div>
                       <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wider text-primary mb-2">
                          <CalendarCheck size={18} /> Rezervacije
                       </h3>
                       <p className="text-xs text-muted">Odredi da li ovaj lokal prima rezervacije stolova. Ako je isključeno, dugme "Rezerviši" se ne prikazuje na stranicama događaja ovog lokala.</p>
                    </div>
                    <button
                       type="button"
                       role="switch"
                       aria-label="Uključi ili isključi rezervacije za lokal"
                       aria-checked={formData.reservationsEnabled}
                       onClick={() => setFormData({ ...formData, reservationsEnabled: !formData.reservationsEnabled })}
                       className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${formData.reservationsEnabled ? 'bg-primary' : 'bg-border'}`}
                    >
                       <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${formData.reservationsEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Info size={18} /> Vlasnik (Gazda)
                 </h3>
                 <p className="text-xs text-muted">Izaberite korisnika koji može upravljati događajima za ovaj lokal.</p>
                 <div>
                    <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Izaberi korisnika</label>
                    <select 
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm font-medium"
                      value={formData.ownerId}
                      onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    >
                       <option value="">Bez vlasnika</option>
                       {users.map(u => (
                         <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                       ))}
                    </select>
                 </div>
              </div>

              <div className="sticky top-24 space-y-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-text font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Save size={20} /> {loading ? 'ČUVANJE...' : 'SNIMI IZMENE'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
