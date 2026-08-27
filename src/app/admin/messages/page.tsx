'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminLayout';
import { MessageSquare, Mail, MapPin,  ArrowRight, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function AdminMessages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages/list');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <>
      <AdminHeader title="Poruke korisnika" />
      <main className="p-8 animate-fade-up relative z-[1]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Inbox</h2>
            <p className="text-muted text-sm mt-1">Upravljajte upitima korisnika za lokale.</p>
          </div>
          <button onClick={fetchMessages} className="p-2 text-muted hover:text-primary transition-colors">
            <RefreshCcw size={20} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-card border border-border rounded-[3rem] p-16 text-center shadow-xl">
             <div className="text-4xl mb-6">📩</div>
             <h3 className="text-xl font-bold uppercase tracking-tight">Nema poruka</h3>
             <p className="text-muted mt-2 font-medium">Trenutno nemate novih upita od korisnika.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.map((m) => (
              <Link 
                key={m.id} 
                href={`/admin/messages/${m.id}`}
                className={`bg-card border ${!m.isRead ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(255,0,128,0.1)]' : 'border-border'} rounded-[2rem] p-6 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-primary/50 transition-all group`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${!m.isRead ? 'bg-primary text-white' : 'bg-surface text-muted'}`}>
                  <MessageSquare size={24} />
                </div>
                
                <div className="flex-grow space-y-1 overflow-hidden">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm uppercase tracking-wider ${!m.isRead ? 'text-white font-black' : 'text-muted font-bold'}`}>
                      {m.senderName}
                    </span>
                    <span className="text-[10px] text-muted font-bold">• {new Date(m.createdAt).toLocaleDateString('bs')}</span>
                  </div>
                  <h4 className="text-base font-black text-white uppercase tracking-tight truncate">{m.subject}</h4>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                      <MapPin size={10} className="text-primary" />
                      <span>{m.venue ? m.venue.name : 'OPŠTI UPIT'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
                      <Mail size={10} className="text-primary" />
                      <span>{m.senderEmail}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-center">
                  {!m.isRead && (
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg uppercase tracking-widest">Nova</span>
                  )}
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center group-hover:bg-primary transition-all">
                    <ArrowRight size={16} className="text-muted group-hover:text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
