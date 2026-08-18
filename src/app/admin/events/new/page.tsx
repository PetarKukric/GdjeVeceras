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

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price.toString()),
          createdById: 'admin-id', // In real app, get from session
          status: 'PUBLISHED' // Admin created events can be published immediately
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
      <main className="p-8 max-w-5xl mx-auto">
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
                          </select>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Lokal (Venue) *</label>
                          <select 
                            required
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
                            value={formData.venueId}
                            onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
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

            {/* Sidebar Form */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2 uppercase tracking-wider text-primary">
                    <ImageIcon size={18} /> Slika i linkovi
                 </h3>
                 <ImageUploader
                    label="Naslovna slika događaja"
                    value={formData.imageUrl}
                    onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                 />
                 <div className="space-y-4 pt-4">
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
