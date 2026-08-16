'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Nedostaje token za verifikaciju.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error);
        }
      } catch {
        setStatus('error');
        setMessage('Greška pri povezivanju sa serverom.');
      }
    }

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-[2.5rem] p-12 text-center shadow-2xl animate-fade-up">
      {status === 'loading' && (
        <div className="space-y-6">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Verifikacija u toku...</h1>
          <p className="text-muted">Molimo sačekajte dok potvrdimo vašu adresu.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-6">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-black uppercase tracking-tight">Uspješno!</h1>
          <p className="text-muted font-medium">{message}</p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full h-14 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs mt-8"
          >
            NASTAVI NA PRIJAVU <ArrowRight size={16} />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Greška</h1>
          <p className="text-red-400 font-medium">{message}</p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full h-14 bg-surface border border-border text-white font-black rounded-2xl hover:bg-card transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs mt-8"
          >
            VRATI SE NA PRIJAVU
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white font-black uppercase tracking-widest animate-pulse">Učitavanje...</div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
