'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Check, 
  X, 
  Edit3, 
  Calendar, 
  MapPin, 
  Clock, 
  Tag,
  ExternalLink,
  ImageIcon
} from 'lucide-react';
import { Event} from '@/types';
import { formatSerbianDate } from '@/lib/date-format';

export default function PendingEvents() {
  const [events, setEvents] = useState<(Event & { createdBy: { name: string, email: string } })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/admin/events?status=PENDING');
        const data = await res.json();
        setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/events/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <AdminHeader title="Događaji na čekanju" />
      <main className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-text">Moderacija sadržaja</h2>
            <p className="text-muted text-sm mt-1">Pregledajte i odobrite događaje koje su kreirali korisnici.</p>
          </div>
          <div className="bg-card px-4 py-2 rounded-xl border border-border flex items-center gap-2 text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            {events.length} Događaja na čekanju
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-card border border-border rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-green-400/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} />
            </div>
            <h3 className="text-xl font-bold">Nema događaja za moderaciju</h3>
            <p className="text-muted mt-2">Sve prijave su trenutno obrađene.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {events.map((event) => (
              <div key={event.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
                {/* Image Section */}
                <div className="lg:w-1/3 bg-surface relative min-h-[200px]">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-border opacity-20"><ImageIcon size={44} /></div>
                  )}
                  <div className="absolute top-4 left-4">
                     <span className="px-3 py-1 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-wider rounded-md shadow-lg">Na čekanju</span>
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-grow p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-text leading-tight mb-2">{event.title}</h3>
                      <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted">
                        <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {formatSerbianDate(event.startDateTime)}</span>
                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-primary" /> {new Date(event.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-primary" /> {event.venue.name}</span>
                        <span className="flex items-center gap-1.5"><Tag size={14} className="text-primary" /> {event.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-text">{event.price || 0} {event.currency}</p>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Cijena ulaza</p>
                    </div>
                  </div>

                  <div className="bg-surface rounded-xl p-4 border border-border mb-6">
                    <h4 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Opis događaja</h4>
                    <p className="text-sm text-text leading-relaxed line-clamp-3">
                      {event.description || 'Nema opisa.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 mb-8">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold">U</div>
                        <div className="text-xs">
                          <p className="font-bold text-text">{event.createdBy.name}</p>
                          <p className="text-muted">Kreator događaja</p>
                        </div>
                     </div>
                     <div className="h-4 w-px bg-border mx-2"></div>
                     <a href="#" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 uppercase">
                       Pogledaj lokaciju <ExternalLink size={12} />
                     </a>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto flex flex-wrap gap-3">
                    <button 
                      onClick={() => handleAction(event.id, 'approve')}
                      className="flex-grow sm:flex-grow-0 px-8 py-3 bg-green-500 text-text font-black rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                    >
                      <Check size={18} /> Odobri objavu
                    </button>
                    <button 
                      onClick={() => handleAction(event.id, 'reject')}
                      className="flex-grow sm:flex-grow-0 px-8 py-3 bg-red-500 text-text font-black rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                    >
                      <X size={18} /> Odbij prijavu
                    </button>
                    <button className="flex-grow sm:flex-grow-0 px-8 py-3 bg-surface border border-border text-text font-black rounded-xl hover:bg-card transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                      <Edit3 size={18} /> Uredi detalje
                    </button>
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
