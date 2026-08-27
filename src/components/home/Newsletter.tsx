'use client';

import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Newsletter CTA bar (po referenci).
 * Koristi POSTOJEĆI backend poruka (/api/messages) — prijave stižu adminu
 * u "Poruke" sa subjektom NEWSLETTER (nema novog backend dijela).
 */
export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('error');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Newsletter prijava',
          email,
          subject: 'NEWSLETTER PRETPLATA',
          message: `Novi newsletter pretplatnik: ${email}`,
        }),
      });
      setState(res.ok ? 'done' : 'error');
      if (res.ok) setEmail('');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="bg-elevated border border-border rounded-3xl p-8 md:p-10 flex flex-col lg:flex-row items-center gap-8">
      <div className="flex items-start gap-5 flex-grow">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
          <Mail size={24} />
        </div>
        <div>
          <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-2">
            Budi u toku sa najboljim događajima!
          </h3>
          <p className="text-muted text-sm leading-relaxed">
            Najnoviji događaji i lokali u tvom gradu — direktno u inbox.
          </p>
        </div>
      </div>

      {state === 'done' ? (
        <p className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 border border-white/10 rounded-2xl px-6 py-4 shrink-0" role="status">
          <CheckCircle2 size={18} className="text-primary" /> Prijavljeni ste!
        </p>
      ) : (
        <form onSubmit={submit} className="flex w-full lg:w-auto gap-3 shrink-0" aria-label="Newsletter prijava">
          <label htmlFor="newsletter-email" className="sr-only">Email adresa</label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="ime@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setState('idle'); }}
            className="h-12 flex-grow lg:w-64 bg-surface border border-border rounded-xl px-4 text-sm font-medium text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={state === 'loading'}
            className="h-12 px-6 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover active:scale-[0.97] transition-all disabled:opacity-50 shrink-0"
          >
            {state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : 'Pretplati se'}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="text-red-400 text-xs font-bold w-full lg:w-auto" role="alert">Unesite ispravnu email adresu.</p>
      )}
    </div>
  );
}
