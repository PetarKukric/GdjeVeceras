'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Plus, 
  MapPin, 
  Globe, 
  Edit, 
  Trash2,
  ExternalLink,
  Search
} from 'lucide-react';
import { Venue } from '@/types';
import Link from 'next/link';

export default function AdminVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchVenues() {
      try {
        const res = await fetch('/api/venues');
        const data = await res.json();
        setVenues(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchVenues();
  }, []);

  const filteredVenues = venues.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (slug: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj lokal? Svi događaji povezani sa ovim lokalom će takođe biti obrisani.')) return;
    
    try {
      const res = await fetch(`/api/venues/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setVenues(prev => prev.filter(v => v.slug !== slug));
      } else {
        alert('Greška pri brisanju.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <AdminHeader title="Upravljanje lokalima" />
      <main className="p-4 md:p-8 space-y-8 animate-fade-up relative z-[1]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Pretraži lokale..." 
              className="w-full pl-12 pr-4 py-2.5 bg-card border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link href="/admin/venues/new" className="flex items-center gap-2 px-6 py-2.5 bg-primary text-text font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 whitespace-nowrap uppercase text-xs tracking-widest">
            <Plus size={18} /> Dodaj novi lokal
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-card border border-border rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <div key={venue.id} className="bg-card border border-border rounded-2xl overflow-hidden group hover:border-primary/50 transition-all flex flex-col shadow-lg">
                <div className="aspect-video bg-surface relative">
                  {venue.imageUrl ? (
                    <img src={venue.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-border italic opacity-20">Nema slike</div>
                  )}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Link href={`/admin/venues/${venue.slug}`} className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-text hover:bg-primary transition-colors">
                      <Edit size={16} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(venue.slug)}
                      className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-text hover:bg-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold mb-1 truncate">{venue.name}</h3>
                  <div className="flex items-center gap-2 text-muted text-xs mb-4">
                    <MapPin size={14} className="text-primary" />
                    <span className="truncate">{venue.address}, {venue.city}</span>
                  </div>
                  <div className="mb-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${venue.reservationsEnabled ? 'text-primary border-primary/30 bg-primary/10' : 'text-muted border-border bg-surface'}`}>
                      {venue.reservationsEnabled ? 'Rezervacije: uključene' : 'Rezervacije: isključene'}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 mb-6">
                    {venue.instagramUrl && (
                      <a href={venue.instagramUrl} className="text-muted hover:text-primary transition-colors">
                        <Globe size={18} />
                      </a>
                    )}
                    {venue.website && (
                      <a href={venue.website} className="text-muted hover:text-primary transition-colors">
                        <Globe size={18} />
                      </a>
                    )}
                    <a href={`/venues/${venue.slug}`} className="text-muted hover:text-primary transition-colors ml-auto">
                      <ExternalLink size={18} />
                    </a>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Aktivni događaji</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">
                       {venue._count?.events || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
