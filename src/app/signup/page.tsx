'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { BottomNav } from '@/components/layout/BottomNav';
import { Lock, Mail, User, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '', // honeypot — skriveno polje protiv botova (ljudi ga nikad ne popune)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    const normalizedEmail = normalizeEmail(formData.email);
    
    if (!normalizedEmail) {
      setEmailError('Unesite ispravnu email adresu.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Unesite ispravnu email adresu.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Lozinka mora imati najmanje 8 znakova.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: normalizedEmail
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        if (data.error === 'Email je već registrovan.') {
          setEmailError(data.error);
        } else if (data.error === 'Unesite ispravnu email adresu.' || data.error === 'Email adresa nije validna ili domena ne prima email.') {
          setEmailError(data.error);
        } else {
          setError(data.error || 'Došlo je do greške pri registraciji.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Mrežna greška. Pokušajte ponovo.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background text-text flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-[2.5rem] p-12 text-center shadow-2xl animate-fade-up">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-xl">
            <Mail size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-4 text-white">Provjerite email</h1>
          <p className="text-muted font-medium mb-10 leading-relaxed">
            Poslali smo verifikacioni link na <span className="text-white font-bold">{formData.email}</span>. Molimo potvrdite adresu da biste aktivirali nalog.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full h-14 bg-surface border border-border text-white font-black rounded-2xl hover:bg-card transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            NASTAVI NA PRIJAVU <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col text-left">
      <main className="flex-grow flex items-center justify-center p-4 pt-12 pb-32 md:pb-12 animate-fade-up">
        <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 text-left">
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight text-primary">REGISTRACIJA</h1>
            <p className="text-muted text-sm font-medium">Pridruži se zajednici i nikad ne propusti dobru žurku.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 text-left">Ime i prezime</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm text-text"
                  placeholder="Marko Marković"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 text-left">Email adresa</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className={`w-full h-14 pl-12 pr-4 bg-surface border ${emailError ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary'} rounded-xl focus:outline-none transition-all text-sm text-text`}
                  placeholder="ime@gmail.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (emailError) setEmailError('');
                  }}
                />
              </div>
              {emailError && (
                <p className="text-red-500 text-[10px] font-bold mt-2 ml-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {emailError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2 text-left">Lozinka</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm text-text"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {/* Honeypot: skriveno polje za botove — ne dirati */}
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, opacity: 0 }}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-text font-black rounded-xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest text-sm mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>REGISTRACIJA...</span>
                </>
              ) : 'REGISTRUJ SE'}
            </button>
          </form>

          <div className="text-center mt-8 pt-8 border-t border-border">
            <p className="text-muted text-[15px] font-medium">
              Već imaš nalog?{' '}
              <button onClick={() => window.location.href='/login'} className="text-primary font-bold underline underline-offset-4 hover:text-white transition-colors">
                Prijavi se
              </button>
            </p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
