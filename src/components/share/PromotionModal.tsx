'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  Loader2, 
  CreditCard, 
  Zap, 
  Calendar,
  Star
} from 'lucide-react';
import { PROMOTION_PLANS, CURRENCY } from '@/lib/promotion-config';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'VENUE' | 'EVENT';
  id: string;
  title: string;
}

let paypalScriptPromise: Promise<void> | null = null;

function loadPayPalScript(clientId: string, environment: string): Promise<void> {
  if (paypalScriptPromise) return paypalScriptPromise;
  paypalScriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('no window')); return; }
    const existing = document.getElementById('paypal-sdk') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).paypal) { resolve(); }
      else { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('SDK load failed'))); }
      return;
    }
    const src = environment === 'live'
      ? `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${CURRENCY}&intent=capture`
      : `https://www.sandbox.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${CURRENCY}&intent=capture`;
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { paypalScriptPromise = null; reject(new Error('SDK load failed')); };
    document.body.appendChild(script);
  });
  return paypalScriptPromise;
}

export function PromotionModal({ isOpen, onClose, type, id, title }: PromotionModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState(PROMOTION_PLANS[1].id);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState('');
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  const selectedPlan = PROMOTION_PLANS.find(p => p.id === selectedPlanId)!;

  const resetPayPal = useCallback(() => {
    setPaypalOrderId(null);
    setPaypalReady(false);
    setPaypalError('');
    if (paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = '';
    }
  }, []);

  // Promjena plana = nova narudžba
  const selectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    resetPayPal();
  };

  // Render PayPal dugmadi kad je SDK spreman i narudžba kreirana
  useEffect(() => {
    if (!paypalReady || !paypalOrderId || !paypalContainerRef.current) return;
    const w = window as any;
    if (!w.paypal) return;

    const captureOnServer = async (orderId: string) => {
      const captureRes = await fetch('/api/promotions/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      if (captureRes.ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          window.location.reload();
        }, 3000);
      } else {
        const err = await captureRes.json();
        alert('Plaćanje nije uspelo: ' + (err.error || 'Nepoznata greška'));
        setPaypalError(err.error || 'Plaćanje nije uspelo.');
      }
    };

    w.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 50 },
      createOrder: () => paypalOrderId,
      onApprove: (data: any) => captureOnServer(data.orderID),
      onError: (err: any) => {
        setPaypalError('PayPal greška: ' + ((err && err.message) || 'nepoznata'));
      },
      onCancel: () => resetPayPal(),
    }).render(paypalContainerRef.current).catch(() => {
      setPaypalError('PayPal dugmad se nisu mogla učitati.');
    });
  }, [paypalReady, paypalOrderId, onClose, resetPayPal]);

  const handlePromote = async () => {
    setLoading(true);
    setPaypalError('');
    try {
      const res = await fetch('/api/promotions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          type,
          venueId: type === 'VENUE' ? id : undefined,
          eventId: type === 'EVENT' ? id : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Greška: ' + (err.error || 'Nepoznata greška'));
        setLoading(false);
        return;
      }

      const { orderId } = await res.json();

      // Simulator (bez PayPal podataka u .env)
      if (orderId.startsWith('SIM-')) {
        alert('Simulator plaćanja: kliknite OK za potvrdu uplate.');
        const captureRes = await fetch('/api/promotions/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });
        if (captureRes.ok) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
            setSuccess(false);
            window.location.reload();
          }, 3000);
        } else {
          const err = await captureRes.json();
          alert('Plaćanje nije uspelo: ' + (err.error || 'Nepoznata greška'));
        }
        setLoading(false);
        return;
      }

      // Pravi PayPal: učitaj SDK i prikaži dugmad
      setPaypalOrderId(orderId);
      try {
        const configRes = await fetch('/api/paypal/config');
        const config = await configRes.json();
        if (!config.ready || !config.clientId) {
          if (config.hint === 'missing') {
            setPaypalError('PayPal nije konfigurisan: u .env fajlu nedostaje PAYPAL_CLIENT_ID.');
          } else if (config.hint === 'invalid_format') {
            setPaypalError('PAYPAL_CLIENT_ID u .env fajlu nije ispravnog formata — provjeri da si kopirao Client ID (a ne Secret), bez navodnika i razmaka.');
          } else {
            setPaypalError('PayPal nije konfigurisan.');
          }
          setLoading(false);
          return;
        }
        await loadPayPalScript(config.clientId, config.environment);
        // Mali predah — provjeri da je SDK zaista spreman
        await new Promise((r) => setTimeout(r, 300));
        if (!(window as any).paypal) {
          setPaypalError('PayPal SDK se učitao ali nije spreman — probaj Ctrl+F5 (osvježi keš) pa ponovo.');
          setLoading(false);
          return;
        }
        setPaypalReady(true);
      } catch {
        setPaypalError('PayPal SDK nije dostupan. Najčešći uzrok: Client ID pripada drugom okruženju (Live umjesto Sandbox ili obrnuto).');
      }
      setLoading(false);
    } catch {
      alert('Mrežna greška.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative bg-card border border-white/10 rounded-[2rem] sm:rounded-[3rem] w-full max-w-xl max-h-[calc(100dvh-32px)] overflow-y-auto scrollbar-hide shadow-[0_0_50px_rgba(255,0,128,0.2)] animate-in zoom-in-95 duration-300">
        
        {success ? (
          <div className="p-16 text-center animate-fade-up">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-pulse">
               <Check size={48} className="text-green-500" strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">Uspešno promovisano!</h3>
            <p className="text-muted font-medium uppercase tracking-widest text-xs">Vaš sadržaj je sada istaknut na platformi.</p>
          </div>
        ) : (
          <>
            <div className="p-5 sm:p-12">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg">
                        <Zap size={24} fill="currentColor" />
                     </div>
                     <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Istakni {type === 'VENUE' ? 'Lokal' : 'Događaj'}</h3>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-2">Povećaj vidljivost na Gdje Večeras</p>
                     </div>
                  </div>
                  <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                    <X size={24} />
                  </button>
               </div>

               <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 mb-8">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Promovišete:</p>
                  <p className="text-lg font-black text-white uppercase tracking-tight">{title}</p>
               </div>

               <div className="space-y-6">
                  <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em] ml-1">Izaberi trajanje promocije:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {PROMOTION_PLANS.map(plan => (
                       <button
                         key={plan.id}
                         onClick={() => selectPlan(plan.id)}
                         className={`p-6 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-2 group ${
                           selectedPlanId === plan.id 
                           ? 'bg-primary/10 border-primary text-white shadow-lg shadow-primary/10' 
                           : 'bg-surface border-white/5 text-muted hover:border-white/20'
                         }`}
                       >
                          <Calendar size={20} className={selectedPlanId === plan.id ? 'text-primary' : ''} />
                          <span className="text-xs font-black uppercase tracking-widest">{plan.label}</span>
                          <span className="text-sm font-black text-white">{plan.price.toFixed(2)} {CURRENCY}</span>
                       </button>
                     ))}
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-[2rem] p-8 space-y-4">
                     <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Star size={14} className="text-primary" fill="currentColor" /> Šta dobijate:
                     </h4>
                     <ul className="space-y-3">
                        {[
                          'Prioritetna pozicija na vrhu početne stranice',
                          'Poseban "ISTAKNUTO" bedž na svim prikazima',
                          'Veća vidljivost i do 5x više klikova',
                          type === 'VENUE' ? 'Automatsko obaveštavanje svih korisnika o novim događajima' : 'Istaknut status do samog početka događaja'
                        ].map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-[10px] font-bold text-muted uppercase tracking-wide">
                             <Check size={14} className="text-green-500 shrink-0 mt-0.5" /> {item}
                          </li>
                        ))}
                     </ul>
                  </div>
               </div>

               <div className="mt-12 flex flex-col gap-4">
                  {paypalError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold">
                      {paypalError}
                    </div>
                  )}

                  {/* Prava PayPal dugmad */}
                  <div ref={paypalContainerRef} className="w-full" />

                  {/* Glavno dugme (kreira narudžbu i prikazuje PayPal dugmad) */}
                  {!paypalReady && (
                    <button 
                      onClick={handlePromote}
                      disabled={loading}
                      className="w-full py-5 bg-[#0070BA] text-white font-black rounded-2xl hover:bg-[#003087] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs shadow-xl disabled:opacity-50"
                    >
                       {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />} 
                       {loading ? 'Procesuiranje...' : `Plati ${selectedPlan.price.toFixed(2)} ${CURRENCY} putem PayPal-a`}
                    </button>
                  )}
                  <p className="text-[8px] text-center text-muted font-bold uppercase tracking-widest opacity-40">Sigurno plaćanje putem PayPal Business gateway-a</p>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
