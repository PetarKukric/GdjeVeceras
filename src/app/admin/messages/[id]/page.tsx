'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Mail, 
  MapPin, 
  User, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function MessageDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [message, setMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMessage() {
      try {
        const res = await fetch(`/api/messages/${id}`);
        if (res.ok) {
          const data = await res.json();
          setMessage(data);
        } else {
          const data = await res.json();
          setError(data.error || 'Poruka nije pronađena.');
        }
      } catch {
        setError('Greška pri učitavanju.');
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchMessage();
  }, [id]);

  if (loading) return <div className="p-10 text-center animate-pulse">Učitavanje poruke...</div>;
  if (error) return (
    <div className="p-10 text-center">
      <p className="text-red-500 font-bold mb-4">{error}</p>
      <button onClick={() => router.back()} className="text-primary hover:underline">Nazad</button>
    </div>
  );

  return (
    <>
      <AdminHeader title="Detalji poruke" />
      <main className="p-8 max-w-4xl animate-fade-up">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors mb-10 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Povratak u inbox</span>
        </button>

        <div className="bg-card border border-border rounded-[3rem] overflow-hidden shadow-2xl">
          {/* Header Info */}
          <div className="p-10 border-b border-border bg-surface/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Predmet</p>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">{message.subject}</h2>
               </div>
               <div className="px-5 py-2 bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black text-primary uppercase tracking-widest">
                  {new Date(message.createdAt).toLocaleString('bs')}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Od</p>
                    <p className="text-sm font-bold text-white">{message.senderName}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Email</p>
                    <p className="text-sm font-bold text-white">{message.senderEmail}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-primary">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Lokal</p>
                    {message.venue ? (
                      <Link href={`/venues/${message.venue.slug}`} className="text-sm font-bold text-white hover:text-primary transition-colors flex items-center gap-1">
                        {message.venue.name} <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-white">OPŠTI UPIT</p>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-10 bg-surface/10">
             <div className="flex items-center gap-3 mb-6">
                <MessageSquare size={16} className="text-primary" />
                <h4 className="text-xs font-black text-white uppercase tracking-widest">Sadržaj poruke</h4>
             </div>
             <div className="bg-background/50 border border-border/50 p-8 rounded-[2rem] min-h-[200px]">
                <p className="text-muted leading-relaxed whitespace-pre-wrap font-medium">
                  {message.message}
                </p>
             </div>
          </div>
          
          {/* Action */}
          <div className="p-10 border-t border-border bg-surface/30 flex justify-end">
             <a 
               href={`mailto:${message.senderEmail}?subject=Re: ${message.subject}`}
               className="px-10 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-[10px]"
             >
                Odgovori putem emaila
             </a>
          </div>
        </div>
      </main>
    </>
  );
}
