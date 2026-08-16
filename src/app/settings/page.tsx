'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { Mail, Shield, LogOut, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        }
      } catch {}
      setLoading(false);
    }
    fetchSession();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Da li ste SIGURNI da želite trajno obrisati svoj nalog? Ova akcija se ne može poništiti.')) return;
    if (!confirm('Posljednja potvrda: sav vaš sadržaj (rezervacije, komentari, poruke) biće trajno obrisan. Nastaviti?')) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Nalog je obrisan');
        window.location.href = '/';
      } else {
        alert(data.error || 'Greška pri brisanju naloga.');
      }
    } catch {
      alert('Mrežna greška.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text flex flex-col">
        <main className="flex-grow flex items-center justify-center">
          <div className="p-10 text-center animate-pulse uppercase font-black tracking-widest text-muted text-xs">Učitavanje...</div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-text flex flex-col">
        <main className="flex-grow max-w-2xl mx-auto w-full px-4 py-16 text-center space-y-6">
          <h1 className="text-3xl font-black uppercase tracking-tight">Niste prijavljeni</h1>
          <Link href="/login" className="inline-block px-10 py-4 bg-primary text-white font-black rounded-xl uppercase tracking-widest text-xs">
            Prijavi se
          </Link>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-2xl mx-auto w-full px-4 py-12 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
          <ArrowLeft size={14} /> Nazad
        </Link>

        <div className="space-y-2">
          <h1 className="text-4xl font-black uppercase tracking-tight">Podešavanja</h1>
          <p className="text-muted text-xs font-bold uppercase tracking-[0.2em]">Tvoj nalog</p>
        </div>

        <ClientOnly>
          <div className="bg-card border border-white/5 rounded-[2rem] p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-black uppercase">
                {user.name?.substring(0, 2) || '??'}
              </div>
              <div>
                <p className="text-base font-black text-white uppercase tracking-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5 mt-1">
                  <Mail size={11} /> {user.email}
                </p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted">
              <Shield size={14} className="text-primary" /> Uloga: {user.role === 'ADMIN' ? 'Administrator' : user.role === 'OWNER' ? 'Vlasnik lokala' : 'Korisnik'}
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <LogOut size={14} /> Odjavi se
            </button>
          </div>
        </ClientOnly>

        {/* OPASNA ZONA */}
        <div className="bg-card border border-red-500/20 rounded-[2rem] p-8 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
            <AlertTriangle size={16} /> Opasna zona
          </h3>
          <p className="text-muted text-xs font-medium leading-relaxed">
            Brisanjem naloga trajno se uklanjaju svi vaši podaci: rezervacije, komentari, poruke, sačuvani događaji.
            Ova akcija se ne može poništiti.
          </p>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
          >
            <Trash2 size={14} /> {deleting ? 'Brisanje...' : 'Obriši nalog trajno'}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
