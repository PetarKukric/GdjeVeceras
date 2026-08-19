'use client';

import React, { useState, useEffect } from 'react';
import {} from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle,  ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';

export default function UserReservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRes = async () => {
    try {
      const res = await fetch('/api/reservations');
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchRes();
  }, []);

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'PENDING': return { label: 'Na čekanju', color: 'text-yellow-500', icon: Clock };
          case 'CONFIRMED': return { label: 'Potvrđeno', color: 'text-green-500', icon: CheckCircle2 };
          case 'CANCELLED': return { label: 'Otkazano', color: 'text-red-500', icon: XCircle };
          case 'NO_SHOW': return { label: 'Nedolazak', color: 'text-gray-500', icon: AlertCircle };
          case 'COMPLETED': return { label: 'Završeno', color: 'text-primary', icon: CheckCircle2 };
          default: return { label: status, color: 'text-muted', icon: AlertCircle };
      }
  };

  // Otkazivanje rezervacije (moguće samo dok događaj nije počeo)
  const cancelReservation = async (res: any) => {
      if (!confirm(`Da li želite otkazati rezervaciju za "${res.event.title}"?`)) return;
      try {
          const response = await fetch('/api/reservations', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: res.id, status: 'CANCELLED' })
          });
          if (response.ok) {
              fetchRes();
          } else {
              const data = await response.json().catch(() => ({}));
              alert(data.error || 'Greška pri otkazivanju rezervacije.');
          }
      } catch {
          alert('Mrežna greška. Pokušajte ponovo.');
      }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-12 space-y-12">
         <div className="space-y-4 text-center">
            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">Moje Rezervacije</h1>
            <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Pratite status svojih zahtjeva za stolove i separea.</p>
         </div>

         {loading ? (
             <div className="py-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-muted">Učitavanje rezervacija...</div>
         ) : reservations.length === 0 ? (
             <EmptyState 
                icon={Calendar} 
                title="Nemaš aktivnih rezervacija" 
                description="Rezerviši svoje mjesto na nekom od predstojećih događaja."
                actionHref="/events"
                actionLabel="ISTRAŽI DOGAĐAJE"
             />
         ) : (
             <div className="grid gap-6">
                {reservations.map(res => {
                    const status = getStatusLabel(res.status);
                    const StatusIcon = status.icon;
                    return (
                        <div key={res.id} className="bg-card border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col md:flex-row items-center gap-5 md:gap-8 group hover:border-primary/20 transition-all shadow-2xl">
                           <div className="w-full md:w-40 aspect-square rounded-[2rem] overflow-hidden bg-surface shrink-0 relative">
                              <img src={res.event.imageUrl || '/hero-bg.jpg'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-black/20" />
                           </div>

                           <div className="flex-grow space-y-4 text-center md:text-left">
                              <div className="space-y-1">
                                 <h3 className="text-xl font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors">{res.event.title}</h3>
                                 <p className="text-sm font-bold text-muted uppercase tracking-widest">{res.venue.name}</p>
                              </div>
                              
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                                 <div className="flex items-center gap-2 text-muted">
                                    <Calendar size={14} className="text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{new Date(res.startTime).toLocaleDateString('bs', {day:'numeric', month:'long'})}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-muted">
                                    <Clock size={14} className="text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{new Date(res.startTime).toLocaleTimeString('bs', {hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-muted">
                                    <Users size={14} className="text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{res.numberOfPeople} Osoba</span>
                                 </div>
                              </div>
                           </div>

                           <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-4 shrink-0">
                              <div className={`px-5 py-2 rounded-full border ${status.color} border-current flex items-center gap-2 text-[9px] font-black uppercase tracking-widest`}>
                                 <StatusIcon size={12} className={res.status === 'PENDING' ? 'animate-pulse' : ''} />
                                 {status.label}
                              </div>
                              <Link href={`/events/${res.event.slug}`} className="text-[9px] font-black text-white hover:text-primary uppercase tracking-widest flex items-center gap-2 group/link">
                                 Detalji događaja <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                              </Link>
                              {(res.status === 'PENDING' || res.status === 'CONFIRMED') && new Date(res.event.startDateTime) > new Date() && (
                                 <button
                                    onClick={() => cancelReservation(res)}
                                    className="px-5 py-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                                 >
                                    <XCircle size={12} /> Otkaži rezervaciju
                                 </button>
                              )}
                           </div>
                        </div>
                    );
                })}
             </div>
         )}

      </main>

      <BottomNav />
    </div>
  );
}
