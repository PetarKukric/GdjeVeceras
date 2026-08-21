'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { isValidEmail, normalizeEmail } from '@/lib/validation';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [adminPasswordSent, setAdminPasswordSent] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setRequiresVerification(false);
    setAdminPasswordSent(false);
    setResendMessage('');

    const normalizedEmail = normalizeEmail(formData.email);

    if (!normalizedEmail) {
      setEmailError('Unesite ispravnu email adresu.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError('Unesite ispravnu email adresu.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email: normalizedEmail
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Admin/owner → admin panel, korisnici → početna
        window.location.href = data.user && (data.user.role === 'ADMIN' || data.user.role === 'OWNER') ? '/admin' : '/';
      } else {
        if (data.adminPasswordSent) {
          setError('');
          setRequiresVerification(false);
          setAdminPasswordSent(true);
        } else if (data.requiresVerification) {
          setRequiresVerification(true);
          setError(data.error);
        } else if (data.error === 'Unesite ispravnu email adresu.') {
          setEmailError(data.error);
        } else {
          setError(data.error || 'Pogrešan email ili lozinka.');
        }
        setLoading(false);
      }
    } catch {
      setError('Mrežna greška. Pokušajte ponovo.');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setResendMessage('');
    
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Greška pri slanju.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 pb-32 md:pb-4 animate-fade-up">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2 uppercase tracking-tight text-primary">PRIJAVA</h1>
          <p className="text-muted text-sm font-medium">Prijavi se da upravljaš svojim događajima.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
            {requiresVerification && (
              <button 
                onClick={handleResend}
                disabled={resending}
                className="text-primary text-xs font-black uppercase tracking-widest hover:underline mt-2 self-start"
              >
                {resending ? 'SLANJE...' : 'POŠALJI PONOVO'}
              </button>
            )}
          </div>
        )}

        {resendMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-xl text-sm font-bold mb-6">
            {resendMessage}
          </div>
        )}

        {adminPasswordSent && (
          <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl text-sm font-bold mb-6 leading-relaxed">
            📧 Nova lozinka je poslana na vašu email adresu.
            <br />
            <span className="text-muted font-medium">Unesite lozinku iz email-a i ponovo kliknite PRIJAVI SE. Lozinka važi 15 minuta i može se iskoristiti samo jednom.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 md:space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Email adresa</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="text"
                required
                className={`w-full h-14 pl-12 pr-4 bg-surface border ${emailError ? 'border-red-500/50 focus:border-red-500' : 'border-border focus:border-primary'} rounded-xl focus:outline-none transition-all text-sm`}
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
            <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-2">Lozinka</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="password"
                required
                className="w-full h-14 pl-12 pr-4 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all text-sm"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-text font-black rounded-xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest text-sm mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>PRIJAVLJIVANJE...</span>
              </>
            ) : 'PRIJAVI SE'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/forgot-password" className="text-muted text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
            Zaboravljena lozinka?
          </Link>
        </div>

        <div className="text-center mt-4 pt-6 border-t border-border">
          <p className="text-muted text-[15px] font-medium">
            Nemaš nalog?{' '}
            <Link href="/signup" className="text-primary font-bold underline underline-offset-4 hover:text-white transition-colors">
              Registruj se
            </Link>
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
