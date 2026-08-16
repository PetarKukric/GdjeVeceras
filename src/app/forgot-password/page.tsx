'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { Mail, Loader2, Send } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(normalizeEmail(email))) {
      setError('Unesite ispravnu email adresu.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || 'Greška. Pokušajte ponovo.');
      }
    } catch {
      setError('Mrežna greška.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight text-primary">Zaboravljena lozinka</h1>
            <p className="text-muted text-sm font-medium">Unesite svoju email adresu i poslaćemo vam uputstvo za prijavu.</p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-5 rounded-2xl text-sm font-bold leading-relaxed">
                Ako nalog sa tom adresom postoji, uputstvo je poslano na email. Provjerite inbox (i spam folder).
              </div>
              <Link href="/login" className="block text-center text-primary text-xs font-black uppercase tracking-widest hover:underline">
                Nazad na prijavu
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Email adresa</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="tvoj@email.com"
                    className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-white font-black rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} POŠALJI
              </button>
              <Link href="/login" className="block text-center text-muted text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                Nazad na prijavu
              </Link>
            </form>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
