'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {} from '@/components/ui/ClientOnly';
import { Search, MessageSquare, ArrowLeft, ArrowRight, Send, ShieldAlert, Ban, Loader2, Info, Globe, MapPin} from 'lucide-react';
import Link from 'next/link';
import {} from '@/components/ui/Toast';
import { EmptyState } from '@/components/ui/EmptyState';

// --- Types ---
interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Conversation {
  id: string;
  otherUser?: User;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  isGlobal?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>('global');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list'); // For mobile

  // 1. Check Session
  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  // 2. Load Conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/list');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      const interval = setInterval(fetchConversations, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [user, fetchConversations]);

  // 3. Load Messages
  const fetchMessages = useCallback(async (id: string) => {
    try {
      const endpoint = id === 'global' ? '/api/chat/global' : `/api/chat/${id}/messages`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (id !== 'global') {
          // Refresh list to clear unread count locally
          setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const interval = setInterval(() => fetchMessages(activeConvId), 3000); // Poll every 3s
      return () => clearInterval(interval);
    }
  }, [activeConvId, fetchMessages]);

  // 4. Send Message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending || !activeConvId) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const endpoint = activeConvId === 'global' ? '/api/chat/global' : `/api/chat/${activeConvId}/messages`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data]);
        if (activeConvId !== 'global') fetchConversations(); // Update last message in sidebar
      } else {
        const err = await res.json();
        alert(err.error || 'Greška pri slanju.');
      }
    } catch {
      alert('Mrežna greška.');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Search Users
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {}
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 6. Start New Chat
  const startNewChat = async (targetUserId: string) => {
    setSearchQuery('');
    setSearchResults([]);
    try {
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConvId(data.id);
        fetchConversations();
        setView('chat');
      }
    } catch {}
  };

  // 7. Block/Report
  const handleBlock = async () => {
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv || !activeConv.otherUser) return;
    if (!confirm(`Da li želite blokirati korisnika ${activeConv.otherUser.name}?`)) return;

    try {
      const res = await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: activeConv.otherUser.id }),
      });
      if (res.ok) {
        alert('Korisnik blokiran.');
        setActiveConvId(null);
        fetchConversations();
      }
    } catch {}
  };

  const handleReport = async () => {
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv || !activeConv.otherUser) return;
    const reason = prompt('Razlog prijave korisnika (Spam, Uznemiravanje, Neprimjeren sadržaj):');
    if (!reason) return;

    try {
      const res = await fetch('/api/chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: activeConv.otherUser.id, reason }),
      });
      if (res.ok) {
        alert('Prijava poslata.');
      }
    } catch {}
  };

  const handleReportMessage = async (messageId: string) => {
    const reason = prompt('Razlog prijave poruke (Spam, Uznemiravanje, Neprimjeren sadržaj):');
    if (!reason) return;

    try {
      const res = await fetch('/api/chat/global/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reason }),
      });
      if (res.ok) {
        alert('Poruka prijavljena.');
      }
    } catch {}
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-[3rem] p-12 text-center shadow-2xl animate-fade-up">
          <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary shadow-xl">
            <MessageSquare size={40} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-4 text-white">Privatni Chat</h1>
          <p className="text-muted font-medium mb-10 leading-relaxed">
            Prijavite se da biste mogli razgovarati sa drugim korisnicima platforme.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full h-14 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
          >
            PRIJAVA <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col max-h-screen overflow-hidden">
      <div className="flex-grow flex overflow-hidden">
        
        {/* --- Sidebar (Chat List) --- */}
        <aside className={`${view === 'chat' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-96 border-r border-border/50 bg-surface/30 backdrop-blur-xl animate-fade-up`}>
          <div className="p-8 border-b border-border/50">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Razgovori</h1>
            </div>

            {/* User Search Input */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="text"
                placeholder="Pretraži korisnike..."
                className="w-full h-12 pl-12 pr-4 bg-background/50 border border-border/50 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all text-white placeholder:text-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Search Results Dropdown */}
              {searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  {isSearching ? (
                    <div className="p-6 text-center text-xs font-bold text-muted animate-pulse uppercase">Tražim...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-xs font-bold text-muted uppercase">Nije pronađen korisnik.</div>
                  ) : (
                    searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => startNewChat(u.id)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-surface transition-all text-left border-b border-border last:border-0"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black uppercase">
                          {u.name.substring(0, 2)}
                        </div>
                        <span className="text-sm font-black text-white uppercase tracking-tight truncate">{u.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto scrollbar-hide">
            {/* Global Chat Item */}
            <button
              onClick={() => {
                setActiveConvId('global');
                setView('chat');
              }}
              className={`w-full p-6 flex items-center gap-4 transition-all border-b border-border/20 group relative ${activeConvId === 'global' ? 'bg-primary/10' : 'hover:bg-surface/50'}`}
            >
              <div className={`w-14 h-14 rounded-2xl shrink-0 border-2 transition-all flex items-center justify-center font-black text-sm uppercase ${activeConvId === 'global' ? 'bg-primary border-white/20 text-white shadow-lg' : 'bg-surface border-border text-primary group-hover:border-primary/50'}`}>
                <Globe size={24} />
              </div>
              <div className="flex-grow overflow-hidden text-left">
                <h4 className={`text-sm font-black uppercase tracking-tight truncate ${activeConvId === 'global' ? 'text-white' : 'text-muted group-hover:text-white'}`}>
                  Globalni Chat
                </h4>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">Naša zajednica</p>
              </div>
            </button>

            {conversations.length === 0 ? (
              <div className="p-10 text-center opacity-30 uppercase font-black text-[10px] tracking-widest pt-20">
                 Nema aktivnih razgovora
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setView('chat');
                  }}
                  className={`w-full p-6 flex items-center gap-4 transition-all border-b border-border/20 group relative ${activeConvId === conv.id ? 'bg-primary/5' : 'hover:bg-surface/50'}`}
                >
                  <div className={`w-14 h-14 rounded-2xl shrink-0 border-2 transition-all flex items-center justify-center font-black text-sm uppercase ${activeConvId === conv.id ? 'bg-primary border-white/20 text-white shadow-lg' : 'bg-surface border-border text-muted group-hover:border-primary/50'}`}>
                    {(conv.otherUser?.name ?? '??').substring(0, 2)}
                  </div>
                  <div className="flex-grow overflow-hidden text-left">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm font-black uppercase tracking-tight truncate ${activeConvId === conv.id ? 'text-white' : 'text-muted group-hover:text-white'}`}>
                        {conv.otherUser?.name ?? 'Korisnik'}
                      </span>
                      {conv.lastMessage && (
                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                          {new Date(conv.lastMessage.createdAt).toLocaleTimeString('bs', {hour: '2-digit', minute: '2-digit'})}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage ? (
                      <p className="text-xs text-muted font-medium truncate opacity-70">
                        {conv.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-[10px] text-primary font-black uppercase tracking-widest italic">Započni razgovor...</p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute right-6 bottom-6 w-5 h-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_10px_#FF0080]">
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* --- Chat Window --- */}
        <main className={`${view === 'list' ? 'hidden' : 'flex'} md:flex flex-col flex-grow bg-background relative animate-in fade-in duration-500`}>
          {activeConvId ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-3 md:h-24 md:px-8 border-b border-border/50 flex items-center justify-between bg-surface/20 backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-4">
                  <button onClick={() => setView('list')} className="md:hidden p-2 text-muted hover:text-white transition-all bg-surface rounded-xl">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xs uppercase shadow-xl shadow-primary/10">
                    {activeConvId === 'global' ? <Globe size={24} /> : (activeConv?.otherUser?.name ?? '??').substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-tight leading-none">
                      {activeConvId === 'global' ? 'Gdje Večeras Chat' : (activeConv?.otherUser?.name ?? 'Korisnik')}
                    </h2>
                    <div className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> {activeConvId === 'global' ? 'Globalna soba' : 'Online'}
                    </div>
                  </div>
                </div>

                {activeConvId !== 'global' && (
                  <div className="flex items-center gap-2">
                     <button onClick={handleReport} className="p-3 text-muted hover:text-white transition-all" title="Prijavi">
                        <ShieldAlert size={18} />
                     </button>
                     <button onClick={handleBlock} className="p-3 text-muted hover:text-pink-500 transition-all" title="Blokiraj">
                        <Ban size={18} />
                     </button>
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-8 space-y-6 scrollbar-hide bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-80">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center opacity-50">
                    <div className="bg-surface/50 border border-border/50 p-10 rounded-[3rem] max-w-xs">
                       <Info size={32} className="mx-auto mb-6 text-primary" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-white leading-relaxed">Ovdje će biti prikazane vaše poruke. Započnite razgovor.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] flex flex-col ${m.senderId === user.id ? 'items-end' : 'items-start'}`}>
                        {/* Name and Role for others in global chat */}
                        {activeConvId === 'global' && m.senderId !== user.id && (
                          <div className="flex items-center gap-2 mb-1.5 ml-2">
                             <span className="text-[10px] font-black text-white uppercase tracking-tight">{m.sender.name}</span>
                             <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                               m.sender.role === 'ADMIN' ? 'bg-accent text-white' : 
                               m.sender.role === 'OWNER' ? 'bg-primary text-white' : 'bg-surface text-muted border border-border'
                             }`}>
                               {m.sender.role === 'OWNER' ? 'VLASNIK' : m.sender.role === 'ADMIN' ? 'ADMIN' : 'KORISNIK'}
                             </span>
                          </div>
                        )}
                        
                        <div className={`p-5 rounded-[1.8rem] text-sm font-medium shadow-2xl relative group/msg ${
                          m.senderId === user.id 
                            ? 'bg-primary text-white rounded-tr-none border-2 border-white/10' 
                            : 'bg-card text-muted border border-border/50 rounded-tl-none'
                        }`}>
                          {m.type === 'EVENT_SHARE' && m.sharedEvent ? (
                            <div className="space-y-4 min-w-[190px] max-w-full">
                               <div className="aspect-[2/1] rounded-2xl overflow-hidden bg-black/20 border border-white/5">
                                  <img src={m.sharedEvent.imageUrl || '/hero-bg.jpg'} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div>
                                  <h4 className="text-sm font-black uppercase tracking-tight line-clamp-1">{m.sharedEvent.title}</h4>
                                  <p className="text-[10px] font-bold opacity-60 uppercase mt-1">{m.sharedEvent.venue?.name}</p>
                                  <p className="text-[9px] font-black text-white bg-white/10 w-fit px-2 py-1 rounded-md mt-2">
                                     {new Date(m.sharedEvent.startDateTime).toLocaleDateString('bs', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()} • {new Date(m.sharedEvent.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                               </div>
                               <Link href={`/events/${m.sharedEvent.slug}`} className="block w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all">
                                  Pogledaj događaj
                               </Link>
                            </div>
                          ) : m.type === 'VENUE_SHARE' && m.sharedVenue ? (
                            <div className="space-y-4 min-w-[190px] max-w-full">
                               <div className="aspect-[2/1] rounded-2xl overflow-hidden bg-black/20 border border-white/5">
                                  <img src={m.sharedVenue.imageUrl || '/hero-bg.jpg'} className="w-full h-full object-cover" alt="" />
                               </div>
                               <div>
                                  <h4 className="text-sm font-black uppercase tracking-tight line-clamp-1">{m.sharedVenue.name}</h4>
                                  <p className="text-[10px] font-bold opacity-60 uppercase mt-1 flex items-center gap-1"><MapPin size={10} /> {m.sharedVenue.city}</p>
                               </div>
                               <Link href={`/venues/${m.sharedVenue.slug}`} className="block w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-center text-[10px] font-black uppercase tracking-widest transition-all">
                                  Pogledaj lokal
                               </Link>
                            </div>
                          ) : m.type === 'EVENT_SHARE' || m.type === 'VENUE_SHARE' ? (
                            <div className="italic text-[10px] py-4 opacity-50 uppercase tracking-widest">Sadržaj više nije dostupan.</div>
                          ) : (
                            m.content
                          )}
                          
                          {/* Report Button for others */}
                          {m.senderId !== user.id && (
                            <button 
                              onClick={() => handleReportMessage(m.id)}
                              className="absolute top-2 -right-10 p-2 text-muted hover:text-red-400 opacity-0 group-hover/msg:opacity-100 transition-all"
                              title="Prijavi poruku"
                            >
                              <ShieldAlert size={14} />
                            </button>
                          )}
                        </div>
                        <p className={`text-[8px] font-black uppercase tracking-widest opacity-40 px-2 mt-1`}>
                          {new Date(m.createdAt).toLocaleTimeString('bs', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {/* Scroll Anchor */}
                <div id="anchor" className="h-4" />
              </div>

              {/* Message Input */}
              <div className="p-3 pb-safe md:p-8 border-t border-border/50 bg-surface/10 backdrop-blur-xl">
                <form 
                  onSubmit={handleSend}
                  className="flex gap-4 items-center bg-card border border-border/50 p-2 rounded-[2rem] shadow-2xl focus-within:border-primary/50 transition-all"
                >
                  <input
                    type="text"
                    placeholder="Napiši poruku..."
                    className="flex-grow h-12 bg-transparent border-none focus:ring-0 text-sm font-medium px-6 text-white placeholder:text-muted/40"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="w-12 h-12 bg-primary text-white rounded-[1.4rem] flex items-center justify-center hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 disabled:opacity-30 disabled:grayscale"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <EmptyState 
                 icon={MessageSquare} 
                 title="Vaš Inbox" 
                 description="Izaberite razgovor iz liste ili pronađite novog prijatelja za izlazak."
              />
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes swing {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(10deg); }
          30% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-swing {
          animation: swing 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
