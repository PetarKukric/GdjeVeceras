'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova.');
      return;
    }
    if (password !== confirm) {
      setError('Lozinke se ne poklapaju.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Greška. Pokušajte ponovo.');
      }
    } catch {
      setError('Mrežna greška.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Lozinka promijenjena!</h1>
        <p className="text-muted text-sm font-medium">Sada se možete prijaviti sa novom lozinkom.</p>
        <Link href="/login" className="block w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all uppercase tracking-widest text-xs">
          Idi na prijavu
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl text-center space-y-4">
        <h1 className="text-2xl font-black uppercase tracking-tight">Neispravan link</h1>
        <p className="text-muted text-sm font-medium">Ovaj link nije ispravan ili je istekao.</p>
        <Link href="/forgot-password" className="block text-primary text-xs font-black uppercase tracking-widest hover:underline">
          Zatraži novi link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 uppercase tracking-tight text-primary">Nova lozinka</h1>
        <p className="text-muted text-sm font-medium">Postavite novu lozinku za svoj nalog.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}
        <div>
          <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Nova lozinka</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Potvrdi lozinku</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-primary text-white font-black rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : null} SPREMI LOZINKU
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow min-h-[80vh] flex items-center justify-center p-4">
        <Suspense fallback={<div className="p-10 text-center text-muted animate-pulse uppercase font-black tracking-widest text-xs">Učitavanje...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
