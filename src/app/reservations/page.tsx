'use client';

import React, { useState, useEffect } from 'react';
import {} from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle,  ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatSerbianDate } from '@/lib/date-format';

export default function UserReservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [loading, setLoading] = useState(true);

  const fetchRes = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/reservations?mine=true');
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      } else { setError(res.status === 401 ? 'Prijavi se za pregled rezervacija.' : 'Rezervacije nije moguće učitati.'); }
    } catch { setError('Mrežna greška. Pokušaj ponovo.'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchRes();
  }, []);

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'PENDING': return { label: 'Na čekanju', color: 'text-yellow-500', icon: Clock };
          case 'CONFIRMED': return { label: 'Potvrđeno', color: 'text-green-500', icon: CheckCircle2 };
          case 'REJECTED': return { label: 'Odbijeno', color: 'text-red-500', icon: XCircle };
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
              setNotice('Rezervacija je otkazana.');
              fetchRes();
          } else {
              const data = await response.json().catch(() => ({}));
              alert(data.error || 'Greška pri otkazivanju rezervacije.');
          }
      } catch {
          alert('Mrežna greška. Pokušajte ponovo.');
      }
  };

  const visible = reservations.filter(res => {
    const end = new Date(res.endTime || res.event?.endDateTime || res.startTime).getTime();
    const active = ['PENDING', 'CONFIRMED'].includes(res.status) && end >= now;
    return tab === 'active' ? active : !active;
  });
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
         <div className="space-y-2">
            <h1 className="text-[30px] font-bold tracking-tight">Moje rezervacije</h1>
            <p className="text-muted text-sm">Pratite status svojih zahtjeva za stolove i separea.</p>
         </div>

         <div className="grid grid-cols-2 border-b border-border" aria-label="Prikaz rezervacija">{([['active','Aktivne'],['history','Istorija']] as const).map(([value,label]) => <button key={value} className={`min-h-12 border-b-2 text-sm ${tab===value?'text-primary border-primary':'border-transparent text-muted'}`} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</div>
         {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
         {error ? <div role="alert"><p>{error}</p><button onClick={fetchRes} className="min-h-11 text-primary">Pokušaj ponovo</button><Link href="/login" className="ml-4">Prijavi se</Link></div> : loading ? (
             <div className="py-20 text-center animate-pulse text-xs font-medium text-muted">Učitavanje rezervacija...</div>
         ) : visible.length === 0 ? (
             <EmptyState
                icon={Calendar}
                title={tab === 'active' ? 'Nemaš aktivnih rezervacija' : 'Istorija je prazna'}
                description="Rezerviši svoje mjesto na nekom od predstojećih događaja."
                actionHref="/events"
                actionLabel="Pronađi događaj"
             />
         ) : (
             <div className="grid gap-6">
                {visible.map(res => {
                    const status = getStatusLabel(res.status);
                    const StatusIcon = status.icon;
                    return (
                        <div key={res.id} className="reservation-card bg-card border border-border rounded-2xl p-4 grid gap-4">
                           <div className="w-20 h-24 rounded-xl overflow-hidden bg-surface shrink-0 relative">
                              <img src={res.event.imageUrl || res.venue.imageUrl || '/logo-final.png'} alt="" className="w-full h-full object-contain transition-transform duration-700" />
                              <div className="absolute inset-0 bg-black/20" />
                           </div>

                           <div className="min-w-0 space-y-3">
                              <div className="space-y-1">
                                 <h3 className="text-lg font-bold break-words text-white group-hover:text-primary transition-colors">{res.event.title}</h3>
                                 <p className="text-sm text-muted">{res.venue.name} · {res.venue.city}</p>
                              </div>

                              <div className="flex flex-wrap items-center justify-start gap-3 pt-2">
                                 <div className="flex items-center gap-2 text-muted">
                                    <Calendar size={14} className="text-primary" />
                                    <span className="text-xs font-medium">{formatSerbianDate(res.startTime)}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-muted">
                                    <Clock size={14} className="text-primary" />
                                    <span className="text-xs font-medium">{new Date(res.startTime).toLocaleTimeString('bs', {timeZone:'Europe/Sarajevo', hour:'2-digit', minute:'2-digit'})}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-muted">
                                    <Users size={14} className="text-primary" />
                                    <span className="text-xs font-medium">{res.numberOfPeople} Osoba</span>
                                 </div>
                              </div>
                           </div>

                           <div className="reservation-card__actions flex flex-wrap items-center gap-3">
                              <div className={`px-5 py-2 rounded-full border ${status.color} border-current flex items-center gap-2 text-xs font-medium`}>
                                 <StatusIcon size={12} className={res.status === 'PENDING' ? 'animate-pulse' : ''} />
                                 {status.label}
                              </div>
                              {(res.assignedItems?.length > 0 || res.assignedGroups?.length > 0) && <p className="text-sm text-muted">Sto / separe: {[...(res.assignedItems || []), ...(res.assignedGroups || [])].map((item:any) => item.label || item.name || item.id).join(', ')}</p>}
                              <Link href={`/events/${res.event.slug}`} className="text-[10px] font-black text-white hover:text-primary uppercase tracking-widest flex items-center gap-2 group/link">
                                 Pogledaj detalje <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                              </Link>
                              {(res.status === 'PENDING' || res.status === 'CONFIRMED') && new Date(res.startTime || res.event.startDateTime).getTime() > now && (
                                 <button
                                    onClick={() => cancelReservation(res)}
                                    className="px-5 py-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-medium flex items-center gap-2"
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
