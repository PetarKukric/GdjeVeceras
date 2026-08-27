'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Clock, 
  Calendar,
  CheckCircle2, 
  XCircle,
  User,
  UserX,
  Phone,
  LayoutDashboard,
  Search,
  CheckCircle,
  RefreshCcw
} from 'lucide-react';
import {} from '@/components/ui/ClientOnly';
import { FloorPlanEditor } from '@/components/admin/FloorPlanEditor';

export default function AdminReservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assigningRes, setAssigningRes] = useState<any>(null);
  const [eventFilter, setEventFilter] = useState<{ id: string, title: string } | null>(null);
  const [eventFilterReady, setEventFilterReady] = useState(false);

  const fetchReservations = async () => {
    try {
      const url = eventFilter ? `/api/reservations?eventId=${encodeURIComponent(eventFilter.id)}` : '/api/reservations';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Dohvati ?event= iz URL-a (dolazak sa stranice događaja)
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (!eventId) {
      setEventFilterReady(true);
      return;
    }
    fetch(`/api/events?limit=100`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const all = data?.events || [];
        const found = all.find((e: any) => e.id === eventId);
        setEventFilter(found ? { id: found.id, title: found.title } : null);
        setEventFilterReady(true);
      })
      .catch(() => setEventFilterReady(true));
  }, []);

  useEffect(() => {
    if (eventFilterReady) fetchReservations();
  }, [eventFilterReady, eventFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) fetchReservations();
    } catch {}
  };

  const filtered = reservations.filter(r => {
    if (filter !== 'ALL' && r.status !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.phone.includes(search)) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'CONFIRMED': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'CANCELLED': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'NO_SHOW': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'COMPLETED': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted bg-white/5 border-white/10';
    }
  };

  return (
    <>
      <AdminHeader title="Rezervacije" />
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
             { label: 'Ukupno', value: reservations.length, color: 'text-white' },
             { label: 'Na čekanju', value: reservations.filter(r => r.status === 'PENDING').length, color: 'text-yellow-500' },
             { label: 'Potvrđeno', value: reservations.filter(r => r.status === 'CONFIRMED').length, color: 'text-green-500' },
             { label: 'Danas', value: reservations.filter(r => new Date(r.startTime).toDateString() === new Date().toDateString()).length, color: 'text-primary' },
           ].map(stat => (
             <div key={stat.label} className="bg-card border border-white/5 p-6 rounded-3xl space-y-2">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
             </div>
           ))}
        </div>

        <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
           {/* FILTER BAR */}
           <div className="p-6 border-b border-white/5 bg-surface/50 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input 
                       type="text" 
                       placeholder="Pretraži ime ili broj..." 
                       className="pl-10 pr-6 py-2.5 bg-background border border-white/10 rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-primary transition-all w-64"
                       value={search}
                       onChange={e => setSearch(e.target.value)}
                    />
                 </div>
                 <select 
                   className="px-4 py-2.5 bg-background border border-white/10 rounded-xl text-[10px] font-black text-white focus:outline-none focus:border-primary transition-all uppercase tracking-widest cursor-pointer"
                   value={filter}
                   onChange={e => setFilter(e.target.value)}
                 >
                    <option value="ALL">SVI STATUSI</option>
                    <option value="PENDING">NA ČEKANJU</option>
                    <option value="CONFIRMED">POTVRĐENO</option>
                    <option value="CANCELLED">OTKAZANO</option>
                    <option value="NO_SHOW">NEDOLAZAK</option>
                 </select>
                 {eventFilter && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
                       <Calendar className="w-3.5 h-3.5 text-primary" />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate max-w-[200px]">{eventFilter.title}</span>
                       <button onClick={() => setEventFilter(null)} className="p-1 hover:bg-white/10 rounded-md text-muted hover:text-white transition-all" title="Ukloni filter">
                          <XCircle size={14} />
                       </button>
                    </div>
                 )}
              </div>
              
              <button onClick={fetchReservations} className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-muted hover:text-white">
                 <RefreshCcw size={18} />
              </button>
           </div>

           {/* TABLE */}
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-surface/30 border-b border-white/5">
                       <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Gost</th>
                       <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Događaj / Vrijeme</th>
                       <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Osobe</th>
                       <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Status</th>
                       <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest text-right">Akcije</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {filtered.length === 0 ? (
                       <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-muted text-xs font-bold uppercase tracking-widest italic opacity-30">
                             Nema pronađenih rezervacija.
                          </td>
                       </tr>
                    ) : (
                       filtered.map(r => (
                          <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted">
                                      <User size={18} />
                                   </div>
                                   <div>
                                      <p className="text-xs font-black text-white uppercase tracking-tight">{r.name}</p>
                                      <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1 mt-1">
                                         <Phone size={10} /> {r.phone}
                                      </p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <p className="text-xs font-bold text-white uppercase truncate max-w-[200px]">{r.event.title}</p>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1 mt-1">
                                   <Clock size={10} /> {new Date(r.startTime).toLocaleTimeString('bs', {hour:'2-digit', minute:'2-digit'})}
                                </p>
                             </td>
                             <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-black text-white">{r.numberOfPeople} MJ</span>
                             </td>
                             <td className="px-8 py-6">
                                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getStatusColor(r.status)}`}>
                                   <div className={`w-1.5 h-1.5 rounded-full ${r.status === 'PENDING' ? 'bg-yellow-500 animate-pulse' : r.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-current'}`} />
                                   {r.status === 'PENDING' ? 'NA ČEKANJU' : r.status === 'CONFIRMED' ? 'POTVRĐENO' : r.status === 'NO_SHOW' ? 'NEDOLAZAK' : r.status === 'CANCELLED' ? 'OTKAZANO' : r.status === 'COMPLETED' ? 'ZAVRŠENO' : r.status}
                                </div>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   {r.status === 'PENDING' && (
                                      <button onClick={() => setAssigningRes(r)} className="px-4 py-2 bg-white/10 text-white hover:bg-primary hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-white/5 shadow-lg">
                                         Dodijeli sto
                                      </button>
                                   )}
                                   {(r.status === 'CONFIRMED' || r.status === 'PENDING') && r.assignedItems && r.assignedItems.length > 0 && (
                                      <button onClick={() => setAssigningRes(r)} className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                         Promijeni sto
                                      </button>
                                   )}
                                   {r.status === 'PENDING' && (
                                      <button onClick={() => updateStatus(r.id, 'CONFIRMED')} className="p-2.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl transition-all border border-green-500/20" title="Potvrdi">
                                         <CheckCircle2 size={16} />
                                      </button>
                                   )}
                                   {r.status !== 'CANCELLED' && r.status !== 'NO_SHOW' && r.status !== 'COMPLETED' && (
                                      <button onClick={() => updateStatus(r.id, 'CANCELLED')} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20" title="Otkaži">
                                         <XCircle size={16} />
                                      </button>
                                   )}
                                   {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                                      <button onClick={() => updateStatus(r.id, 'NO_SHOW')} className="p-2.5 bg-gray-500/10 text-gray-400 hover:bg-gray-500 hover:text-white rounded-xl transition-all border border-gray-500/20" title="Nedolazak">
                                         <UserX size={16} />
                                      </button>
                                   )}
                                   {r.status === 'CONFIRMED' && (
                                      <button onClick={() => updateStatus(r.id, 'COMPLETED')} className="p-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all border border-primary/20" title="Završi">
                                         <CheckCircle size={16} />
                                      </button>
                                   )}
                                </div>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        {assigningRes && (
            <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col p-4 md:p-10 animate-in fade-in duration-500">
                <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <LayoutDashboard size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-white">
                                    {assigningRes.assignedItems && assigningRes.assignedItems.length > 0 ? 'Promjena stola / separeira' : 'Dodjela stola / separeira'}
                                </h3>
                                <p className="text-[10px] md:text-xs font-medium text-muted uppercase tracking-widest mt-1">
                                    {assigningRes.name} • {assigningRes.numberOfPeople} OSOBA • {new Date(assigningRes.startTime).toLocaleTimeString('bs', {hour:'2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setAssigningRes(null)}
                            className="px-4 md:px-8 py-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 shrink-0"
                        >
                            Odustani
                        </button>
                    </div>

                    <div className="flex-grow min-h-0 bg-background/50 rounded-3xl md:rounded-3xl border border-white/5 overflow-y-auto shadow-2xl relative">
                        <FloorPlanEditor 
                            venueSlug={assigningRes.venue.slug} 
                            eventSlug={assigningRes.event.slug} 
                            mode="EVENT" 
                            assigningReservationId={assigningRes.id}
                            onAssignmentComplete={() => {
                                setAssigningRes(null);
                                fetchReservations();
                            }}
                        />
                    </div>
                </div>
            </div>
        )}

      </main>
    </>
  );
}
