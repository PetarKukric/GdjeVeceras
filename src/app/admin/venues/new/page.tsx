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
import { useRouter } from 'next/navigation';
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

export default function NewVenue() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string, name: string, email: string }[]>([]);
  const [customTag, setCustomTag] = useState('');
  const { showToast } = useToast();
  
  const [openingHours, setOpeningHours] = useState([
    { dayGroup: 'WEEKDAYS', openTime: '08:00', closeTime: '23:00', isClosed: false },
    { dayGroup: 'FRIDAY', openTime: '08:00', closeTime: '02:00', isClosed: false },
    { dayGroup: 'SATURDAY', openTime: '10:00', closeTime: '03:00', isClosed: false },
    { dayGroup: 'SUNDAY', openTime: '10:00', closeTime: '22:00', isClosed: false },
  ]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    address: string;
    city: string;
    latitude: string;
    longitude: string;
    phone: string;
    website: string;
    instagramUrl: string;
    facebookUrl: string;
    tiktokUrl: string;
    imageUrl: string;
    ownerId: string;
    reservationsEnabled: boolean;
  }>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.name || !formData.address || !formData.city) {
        alert('Molimo popunite obavezna polja (Naziv, Adresa, Grad).');
        return;
      }
      if (formData.phone && !isValidBosnianPhone(formData.phone)) {
        alert('Unesite ispravan broj telefona (npr. +387 66 123 456 ili 066 123 456).');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/venues', {
        method: 'POST',
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
        showToast('Lokal uspješno kreiran');
        router.push('/admin/venues');
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

  return (
    <>
      <AdminHeader title="Novi lokal" />
      <main className="p-8 max-w-5xl mx-auto">
        <Link href="/admin/venues" className="inline-flex items-center gap-2 text-muted hover:text-text mb-8 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Nazad na listu
        </Link>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Info */}
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
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="Npr. Club Cristal"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Opis</label>
                      <textarea 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm min-h-[120px]"
                        placeholder="Kratak opis lokala, ponuda, atmosfera..."
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
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                            placeholder="Ulica i broj"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <MapPin size={18} /> Koordinate (opciono)
                 </h3>
                 <p className="text-xs text-muted">Potrebno za precizan prikaz na mapi.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="45.1465"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="17.2536"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                 </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Phone size={18} /> Kontakt i Linkovi
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Telefon</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="+387 6X XXX XXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Website</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        placeholder="https://..."
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Instagram URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.instagramUrl}
                        onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Facebook URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.facebookUrl}
                        onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">TikTok URL</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                        value={formData.tiktokUrl}
                        onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                      />
                    </div>
                 </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                 <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <Clock size={18} /> Radno vrijeme
                 </h3>
                 <div className="space-y-6">
                    {openingHours.map((group, index) => (
                       <div key={group.dayGroup} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface/50 rounded-xl border border-border/50">
                          <div className="min-w-[140px]">
                             <p className="text-xs font-black uppercase tracking-widest">
                                {group.dayGroup === 'WEEKDAYS' ? 'Radni dani (Pon-Čet)' : 
                                 group.dayGroup === 'FRIDAY' ? 'Petak' :
                                 group.dayGroup === 'SATURDAY' ? 'Subota' : 'Nedjelja'}
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
                                      className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
                                      value={group.openTime || ''}
                                      onChange={(e) => handleHourChange(index, 'openTime', e.target.value)}
                                   />
                                   <span className="text-muted">→</span>
                                   <input 
                                      type="time" 
                                      className="px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold focus:outline-none focus:border-primary"
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
                          className="flex-grow px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
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
            </div>

            {/* Sidebar Form */}
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
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
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
                  <Save size={20} /> {loading ? 'ČUVANJE...' : 'SAČUVAJ LOKAL'}
                </button>
                <Link href="/admin/venues" className="block w-full py-4 bg-surface border border-border text-muted font-bold rounded-2xl text-center hover:text-text transition-all text-sm uppercase tracking-widest">
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
