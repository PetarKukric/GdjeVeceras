'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  X, 
  Search, 
  Send, 
  Link as LinkIcon, 
  Share2, 
  Check,
  Loader2,
  User
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'event' | 'venue';
  data: {
    id: string;
    title: string;
    slug: string;
    imageUrl?: string;
  };
}

export function ShareModal({ isOpen, onClose, type, data }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [copied, setCheck] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copyError, setCopyError] = useState(false);
  const [successRecipient, setSuccessRecipient] = useState<string | null>(null);
  const { showToast } = useToast();

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/${type === 'event' ? 'events' : 'venues'}/${data.slug}`
    : '';

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const result = await res.json();
        setCurrentUser(result.user);
      }
    }
    if (isOpen) fetchSession();
  }, [isOpen]);

  useEffect(() => {
    async function searchUsers() {
      if (searchQuery.length < 2) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const result = await res.json();
          setUsers(result.filter((u: any) => u.id !== currentUser?.id));
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCheck(true);
        showToast('Link kopiran');
        setTimeout(() => setCheck(false), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch {
      setCopyError(true);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: `Pogledaj ${data.title} na Gdje Večeras!`,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleSendToUser = async (recipientId: string) => {
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setSendingId(recipientId);
    try {
      const convRes = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: recipientId })
      });
      
      if (convRes.ok) {
        const conversation = await convRes.json();
        
        const msgRes = await fetch(`/api/chat/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Podijelio ${type === 'event' ? 'događaj' : 'lokal'}: ${data.title}`,
            type: type === 'event' ? 'EVENT_SHARE' : 'VENUE_SHARE',
            sharedEventId: type === 'event' ? data.id : undefined,
            sharedVenueId: type === 'venue' ? data.id : undefined,
          })
        });

        if (msgRes.ok) {
           const recipient = users.find(u => u.id === recipientId);
           setSuccessRecipient(recipient?.name || 'prijatelju');
           showToast('Sadržaj podijeljen');
           setTimeout(() => {
             onClose();
             setSuccessRecipient(null);
           }, 2000);
        }
      }
    } catch {
      alert('Greška pri slanju.');
    } finally {
      setSendingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-card border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-md max-h-[calc(100dvh-32px)] overflow-y-auto scrollbar-hide shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black uppercase tracking-tight">PODIJELI</h3>
            <button onClick={onClose} className="text-muted hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            {successRecipient ? (
              <div className="py-12 text-center animate-fade-up">
                 <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-in zoom-in duration-500">
                    <Check size={40} className="text-green-500" strokeWidth={3} />
                 </div>
                 <h4 className="text-xl font-black uppercase tracking-tight mb-2">Poslano!</h4>
                 <p className="text-muted text-xs font-bold uppercase tracking-widest">Sadržaj je poslan korisniku {successRecipient}.</p>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-4 bg-primary rounded-full" />
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Pošalji prijatelju</h4>
                  </div>

                  {!currentUser ? (
                    <div className="bg-surface/50 border border-white/5 rounded-2xl p-6 text-center">
                       <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Prijavi se da pošalješ prijatelju na Gdje Večeras.</p>
                       <Link href="/login" className="inline-block px-8 py-3 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest">Prijava</Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="relative group">
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                          <input 
                            type="text" 
                            placeholder="Pretraži korisnike..."
                            className="w-full pl-12 pr-4 py-4 bg-surface border border-white/5 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all text-white placeholder:text-muted/30"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                       </div>

                       <div className="max-h-[200px] overflow-y-auto space-y-2 scrollbar-hide">
                          {loading && <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></div>}
                          {users.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-surface/30 border border-white/5 rounded-2xl hover:border-primary/30 transition-all group">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-muted overflow-hidden">
                                     {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-tight">{u.name || u.email.split('@')[0]}</span>
                               </div>
                               <button 
                                 onClick={() => handleSendToUser(u.id)}
                                 disabled={sendingId === u.id}
                                 className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-all disabled:opacity-50"
                               >
                                  {sendingId === u.id ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                               </button>
                            </div>
                          ))}
                          {!loading && searchQuery.length >= 2 && users.length === 0 && (
                            <p className="text-center py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Nema rezultata.</p>
                          )}
                       </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-4 bg-accent rounded-full" />
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Podijeli van sajta</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <button 
                       onClick={handleNativeShare}
                       className="flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all group"
                     >
                        <Share2 size={16} className="text-primary group-hover:scale-110 transition-transform" /> Podijeli
                     </button>
                     <button 
                       onClick={handleCopyLink}
                       className="flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all group"
                     >
                        {copied ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} className="text-accent group-hover:rotate-12 transition-transform" />}
                        {copied ? 'Kopirano' : 'Kopiraj'}
                     </button>
                  </div>

                  {copyError && (
                    <div className="mt-4 p-4 bg-surface/80 border border-white/5 rounded-2xl">
                       <p className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Ručno kopiraj link:</p>
                       <input 
                         readOnly 
                         value={shareUrl}
                         className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-[10px] text-primary font-mono outline-none"
                         onClick={(e) => (e.target as HTMLInputElement).select()}
                       />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
