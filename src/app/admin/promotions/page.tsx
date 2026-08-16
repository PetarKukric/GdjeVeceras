'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { 
  Zap, 
  Calendar, 
  Clock, 
  CreditCard, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromotions() {
      try {
        const res = await fetch('/api/promotions/list');
        if (res.ok) {
          const data = await res.json();
          setPromotions(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchPromotions();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-green-500/20"><CheckCircle2 size={10} /> Aktuelno</span>;
      case 'PENDING_PAYMENT':
        return <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-yellow-500/20"><Clock3 size={10} /> Čeka plaćanje</span>;
      case 'EXPIRED':
        return <span className="px-3 py-1 bg-muted/10 text-muted rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-border/50"><XCircle size={10} /> Isteklo</span>;
      case 'PAYMENT_FAILED':
        return <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-red-500/20"><AlertCircle size={10} /> Neuspelo</span>;
      default:
        return <span className="px-3 py-1 bg-card text-muted rounded-full text-[8px] font-black uppercase tracking-widest border border-border">{status}</span>;
    }
  };

  return (
    <>
      <AdminHeader title="Promocije" />
      <main className="p-8 max-w-7xl mx-auto animate-fade-up">
        <div className="flex items-center justify-between mb-12">
           <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Moje Promocije</h2>
              <p className="text-muted text-[10px] font-bold uppercase tracking-widest mt-2">Upravljajte plaćenim isticanjem vašeg sadržaja.</p>
           </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-card border border-border rounded-[2.5rem] p-20 text-center">
             <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-xl">
                <Zap size={32} fill="currentColor" />
             </div>
             <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Još nemate aktivnih promocija</h3>
             <p className="text-muted text-xs font-bold uppercase tracking-widest max-w-md mx-auto mb-10 leading-relaxed">
                Istaknite svoj lokal ili događaj da biste povećali vidljivost i dosegli više posetilaca.
             </p>
             <Link href="/admin/venues" className="px-10 py-4 bg-primary text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all inline-block">
                ISTAKNI SADRŽAJ
             </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-card border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:border-primary/20 transition-all shadow-xl relative overflow-hidden">
                {promo.status === 'ACTIVE' && <div className="absolute top-0 left-0 w-1 h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" />}
                
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-primary shadow-lg">
                      {promo.type === 'VENUE' ? <Zap size={24} fill="currentColor" /> : <Calendar size={24} />}
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">
                           {promo.type === 'VENUE' ? promo.venue?.name : promo.event?.title}
                        </h4>
                        {getStatusBadge(promo.status)}
                      </div>
                      <div className="flex flex-wrap gap-4">
                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted uppercase tracking-widest">
                            <Clock size={12} className="text-primary" /> 
                            {promo.startAt ? new Date(promo.startAt).toLocaleDateString('bs') : 'Nije počelo'} – {promo.endAt ? new Date(promo.endAt).toLocaleDateString('bs') : 'N/A'}
                         </div>
                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted uppercase tracking-widest">
                            <CreditCard size={12} className="text-primary" /> {promo.price.toFixed(2)} {promo.currency}
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                   {promo.paypalOrderId && (
                     <p className="text-[7px] font-mono text-muted uppercase tracking-widest opacity-40 absolute bottom-3 right-8">Order ID: {promo.paypalOrderId}</p>
                   )}
                   <Link 
                     href={promo.type === 'VENUE' ? `/venues/${promo.venue?.slug}` : `/events/${promo.event?.slug}`}
                     target="_blank"
                     className="px-6 py-3 bg-surface border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-primary transition-all flex items-center gap-2"
                   >
                     Pogledaj <ExternalLink size={12} />
                   </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
