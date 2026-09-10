'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { FloorPlanEditor } from '@/components/admin/FloorPlanEditor';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { formatSerbianDate } from '@/lib/date-format';

export default function AdminFloorPlan() {
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'DEFAULT' | 'EVENT'>('DEFAULT');

  useEffect(() => {
    async function fetchData() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        
        const venuesRes = await fetch('/api/venues');
        const allVenues = await venuesRes.json();
        
        // Filter venues user owns
        const owned = allVenues.filter((v: any) => v.ownerId === session.user.id || session.user.role === 'ADMIN');
        
        // Dohvati događaje za svaki lokal (potrebno za EVENT tab listu)
        const withEvents = await Promise.all(owned.map(async (v: any) => {
          try {
            const evRes = await fetch(`/api/events?venue=${encodeURIComponent(v.slug)}`);
            if (evRes.ok) {
              const evData = await evRes.json();
              return { ...v, events: evData.events || [] };
            }
          } catch { /* preskoči — lokala bez događaja */ }
          return { ...v, events: [] };
        }));
        
        setVenues(withEvents);
        if (withEvents.length > 0) setSelectedVenue(withEvents[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse uppercase font-black tracking-widest text-muted">Učitavanje...</div>;

  return (
    <>
      <AdminHeader title="Raspored stolova" />
      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {venues.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-20 text-center space-y-4">
             <MapPin size={48} className="mx-auto text-muted opacity-20" />
             <h3 className="text-xl font-black uppercase tracking-tight">Nemate dodijeljenih lokala</h3>
             <p className="text-muted text-xs font-bold uppercase tracking-widest">Samo vlasnici lokala mogu upravljati rasporedom stolova.</p>
          </div>
        ) : (
          <>
            <div className="lg:hidden grid gap-3 rounded-2xl border border-border bg-card p-3">
              <label className="text-xs font-semibold text-muted">Lokal<select value={selectedVenue?.id || ''} onChange={event => { const venue=venues.find(item => item.id===event.target.value); setSelectedVenue(venue || null); setSelectedEvent(null); }} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-white">{venues.map(venue => <option key={venue.id} value={venue.id}>{venue.name} · {venue.city}</option>)}</select></label>
              <div className="grid grid-cols-2 rounded-xl border border-border bg-background p-1"><button onClick={() => setTab('DEFAULT')} className={`h-10 rounded-lg text-sm font-semibold ${tab==='DEFAULT'?'bg-primary text-white':'text-muted'}`}>Osnovni plan</button><button onClick={() => setTab('EVENT')} className={`h-10 rounded-lg text-sm font-semibold ${tab==='EVENT'?'bg-primary text-white':'text-muted'}`}>Događaj</button></div>
              {tab==='EVENT' && <label className="text-xs font-semibold text-muted">Događaj<select value={selectedEvent?.id || ''} onChange={event => setSelectedEvent(selectedVenue.events?.find((item:any)=>item.id===event.target.value)||null)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-white"><option value="">Izaberi događaj</option>{selectedVenue.events?.filter((item:any)=>new Date(item.startDateTime)>=new Date(Date.now()-86400000)).map((item:any)=><option key={item.id} value={item.id}>{item.title} · {formatSerbianDate(item.startDateTime)}</option>)}</select></label>}
            </div>
            <div className="flex flex-col lg:flex-row gap-8">
               {/* VENUE SELECTION */}
               <div className="hidden lg:block lg:w-1/4 space-y-4">
                  <h4 className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Lokal</h4>
                  <div className="space-y-2">
                    {venues.map(v => (
                       <button
                         key={v.id}
                         onClick={() => {
                             setSelectedVenue(v);
                             setSelectedEvent(null);
                         }}
                         className={`w-full p-4 rounded-2xl border text-left transition-all ${selectedVenue?.id === v.id ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' : 'border-white/5 bg-card/50 hover:border-white/20'}`}
                       >
                         <p className={`text-xs font-black uppercase tracking-tight ${selectedVenue?.id === v.id ? 'text-primary' : 'text-white'}`}>{v.name}</p>
                         <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">{v.city}</p>
                       </button>
                    ))}
                  </div>

                  {selectedVenue && (
                    <>
                      <div className="h-px bg-white/5 my-6" />
                      <h4 className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Tip rasporeda</h4>
                      <div className="grid grid-cols-1 gap-2">
                         <button 
                            onClick={() => setTab('DEFAULT')}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${tab === 'DEFAULT' ? 'border-accent bg-accent/10' : 'border-white/5 bg-card/30 hover:border-white/20'}`}
                         >
                            <div>
                               <p className={`text-xs font-black uppercase tracking-tight ${tab === 'DEFAULT' ? 'text-accent' : 'text-white'}`}>Osnovni plan</p>
                               <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Default template</p>
                            </div>
                            <ChevronRight size={16} className={`transition-transform ${tab === 'DEFAULT' ? 'text-accent translate-x-1' : 'text-muted'}`} />
                         </button>
                         <button 
                            onClick={() => setTab('EVENT')}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${tab === 'EVENT' ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-card/30 hover:border-white/20'}`}
                         >
                            <div>
                               <p className={`text-xs font-black uppercase tracking-tight ${tab === 'EVENT' ? 'text-pink-500' : 'text-white'}`}>Plan za događaj</p>
                               <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Samo za veče</p>
                            </div>
                            <ChevronRight size={16} className={`transition-transform ${tab === 'EVENT' ? 'text-pink-500 translate-x-1' : 'text-muted'}`} />
                         </button>
                      </div>

                      {tab === 'EVENT' && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-left-4">
                           <h4 className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Izaberi događaj</h4>
                           <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                              {selectedVenue.events?.filter((e: any) => new Date(e.startDateTime) >= new Date(Date.now() - 86400000)).map((e: any) => (
                                 <button
                                    key={e.id}
                                    onClick={() => setSelectedEvent(e)}
                                    className={`w-full p-3 rounded-xl border text-left transition-all ${selectedEvent?.id === e.id ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-background hover:border-white/10'}`}
                                 >
                                    <p className="text-[10px] font-black text-white uppercase truncate">{e.title}</p>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                       {formatSerbianDate(e.startDateTime)}
                                    </p>
                                 </button>
                              ))}
                              {(!selectedVenue.events || selectedVenue.events.length === 0) && (
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest italic text-center py-4">Nema aktivnih događaja</p>
                              )}
                           </div>
                        </div>
                      )}
                    </>
                  )}
               </div>

               {/* EDITOR AREA */}
               <div className="min-w-0 lg:w-3/4">
                  {tab === 'DEFAULT' && selectedVenue && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                         <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_#F5C518]" />
                            <h3 className="text-lg font-black uppercase tracking-tight">Uređivanje osnovnog plana: {selectedVenue.name}</h3>
                         </div>
                         <ClientOnly>
                            <FloorPlanEditor venueSlug={selectedVenue.slug} mode="DEFAULT" />
                         </ClientOnly>
                      </div>
                  )}
                  {tab === 'EVENT' && selectedVenue && (
                      <div className="space-y-4 animate-in fade-in duration-500">
                         {!selectedEvent ? (
                            <div className="bg-card/50 border border-white/5 rounded-3xl px-6 py-20 text-center flex flex-col items-center justify-center gap-6">
                               <Calendar size={48} className="text-muted opacity-10" />
                               <p className="text-muted text-xs font-bold uppercase tracking-widest">Izaberi događaj sa liste da urediš raspored za to veče.</p>
                            </div>
                         ) : (
                            <>
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#FF006E]" />
                                     <h3 className="text-lg font-black uppercase tracking-tight">{selectedEvent.title} @ {selectedVenue.name}</h3>
                                  </div>
                                  <div className="px-4 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full text-[10px] font-black text-pink-500 uppercase tracking-[0.2em]">
                                     Event-Specific Layout
                                  </div>
                               </div>
                               <ClientOnly>
                                  <FloorPlanEditor venueSlug={selectedVenue.slug} eventSlug={selectedEvent.slug} mode="EVENT" />
                               </ClientOnly>
                            </>
                         )}
                      </div>
                  )}
               </div>
            </div>
          </>
        )}

      </main>
    </>
  );
}
