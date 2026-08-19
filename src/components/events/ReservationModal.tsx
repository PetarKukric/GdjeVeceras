'use client';

import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Clock, 
  Phone, 
  User, 
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send
} from 'lucide-react';

import { useToast } from '@/components/ui/Toast';
import { isValidBosnianPhone } from '@/lib/validation';
import { toISOFromLocalInput, toLocalDatetimeValue } from '@/lib/bosnia-time';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  user?: any;
}

export function ReservationModal({ isOpen, onClose, event, user }: ReservationModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    numberOfPeople: 2,
    startTime: event.startDateTime ? toLocalDatetimeValue(new Date(event.startDateTime)) : '',
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validacija telefona (BiH broj)
    if (!isValidBosnianPhone(formData.phone)) {
      setError('Unesite ispravan broj telefona (npr. +387 66 123 456 ili 066 123 456).');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startTime: toISOFromLocalInput(formData.startTime),
          eventId: event.id
        })
      });

      if (res.ok) {
        setSuccess(true);
        showToast('Zahtjev za rezervaciju poslat');
      } else {
        const data = await res.json();
        setError(data.error || 'Greška pri slanju rezervacije.');
      }
    } catch {
      setError('Mrežna greška.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-lg max-h-[calc(100dvh-32px)] overflow-y-auto scrollbar-hide shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="p-5 sm:p-8 border-b border-white/5 bg-surface/50 flex items-center justify-between">
           <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Rezervacija</h3>
              <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">{event.title}</p>
           </div>
           <button onClick={onClose} aria-label="Zatvori" title="Zatvori" className="p-3 hover:bg-white/5 rounded-2xl transition-all text-muted hover:text-white">
              <X size={24} />
           </button>
        </div>

        <div className="p-5 sm:p-8">
           {success ? (
              <div className="py-12 text-center space-y-6 animate-fade-up">
                 <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-lg shadow-green-500/10">
                    <CheckCircle size={40} />
                 </div>
                 <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase tracking-tight text-white">Zahtjev poslat!</h4>
                    <p className="text-muted text-xs font-medium max-w-xs mx-auto leading-relaxed uppercase tracking-widest">
                       Vlasnik lokala će pregledati Vašu rezervaciju i potvrditi je uskoro.
                    </p>
                 </div>
                 <button 
                   onClick={onClose}
                   className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                 >
                    Zatvori
                 </button>
              </div>
           ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                 {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold animate-pulse">
                       <AlertCircle size={18} /> {error}
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Broj osoba</label>
                       <div className="relative">
                          <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                          <input 
                            type="number" 
                            min="1" 
                            max="50"
                            required
                            className="w-full pl-12 pr-6 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-bold text-white transition-all"
                            value={formData.numberOfPeople || ''}
                            onChange={e => setFormData({ ...formData, numberOfPeople: parseInt(e.target.value) || 0 })}
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Vrijeme dolaska</label>
                       <div className="relative">
                          <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                          <input 
                            type="datetime-local" 
                            required
                            className="w-full pl-12 pr-4 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-bold text-white transition-all"
                            value={formData.startTime}
                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Ime i Prezime</label>
                       <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                          <input 
                            type="text" 
                            required
                            placeholder="Kako se zovete?"
                            className="w-full pl-12 pr-6 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-bold text-white transition-all"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                          />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Kontakt telefon</label>
                           <div className="relative">
                              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                              <input 
                                type="tel" 
                                required
                                placeholder="065..."
                                className="w-full pl-12 pr-6 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-bold text-white transition-all"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">E-mail (opciono)</label>
                           <div className="relative">
                              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                              <input 
                                type="email" 
                                placeholder="vase@ime.com"
                                className="w-full pl-12 pr-6 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-bold text-white transition-all"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                              />
                           </div>
                        </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Napomena / Posebne želje</label>
                    <textarea 
                       className="w-full px-6 py-4 bg-surface border border-white/5 rounded-2xl focus:outline-none focus:border-primary text-sm font-medium text-white transition-all min-h-[100px]"
                       placeholder="Želimo sto pored bine, slavimo rođendan..."
                       value={formData.notes}
                       onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                 </div>

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full py-5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> POŠALJI REZERVACIJU</>}
                 </button>
              </form>
           )}
        </div>

      </div>
      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
