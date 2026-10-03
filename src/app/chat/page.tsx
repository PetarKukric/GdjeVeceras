'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MessageSquare, ArrowLeft, Send, ShieldAlert, Ban, Loader2, Globe, MapPin, PenSquare, ChevronDown, X, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { useLang } from '@/components/i18n/LangProvider';

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
  const { t, lang } = useLang();
  const locale = lang === 'en' ? 'en-GB' : 'sr-Latn';
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
  const [conversationQuery, setConversationQuery] = useState('');
  const [findingUsers, setFindingUsers] = useState(false);
  const [sendError, setSendError] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const previousMessageCount = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageRequestRef = useRef(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const [friends, setFriends] = useState<User[] | null>(null);
  const [reportTarget, setReportTarget] = useState<{ kind: 'user' | 'message'; id: string } | null>(null);
  const [notice, setNotice] = useState('');

  // 1. Check Session
  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/auth/session').catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.user) setUser(data.user);
      else setLoading(false);
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
      const refresh = () => { if (document.visibilityState === 'visible') fetchConversations(); };
      const interval = setInterval(refresh, 15000);
      document.addEventListener('visibilitychange', refresh);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
    }
  }, [user, fetchConversations]);

  // 3. Load Messages
  const fetchMessages = useCallback(async (id: string) => {
    const requestId = ++messageRequestRef.current;
    try {
      const endpoint = id === 'global' ? '/api/chat/global' : `/api/chat/${id}/messages`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (requestId !== messageRequestRef.current) return;
        setMessages(data);
        if (data.length > previousMessageCount.current && !nearBottomRef.current) setHasNewMessages(true);
        previousMessageCount.current = data.length;
        if (id !== 'global') {
          // Refresh list to clear unread count locally
          setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
        }
      }
    } catch {}
  }, []);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    nearBottomRef.current = true;
    setHasNewMessages(false);
  }, []);

  useEffect(() => {
    if (nearBottomRef.current) requestAnimationFrame(() => scrollToLatest(previousMessageCount.current ? 'smooth' : 'auto'));
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      const refresh = () => { if (document.visibilityState === 'visible') fetchMessages(activeConvId); };
      const interval = setInterval(refresh, 5000);
      document.addEventListener('visibilitychange', refresh);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
    }
  }, [activeConvId, fetchMessages]);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    // Visina = vidljivi dio ekrana minus header (i traka za potvrdu emaila) iznad chata — da polje za poruku uvijek bude vidljivo
    const updateHeight = () => {
      const top = Math.max(0, shellRef.current?.getBoundingClientRect().top ?? 0);
      root.style.setProperty('--chat-viewport-height', `${(viewport?.height || window.innerHeight) - top}px`);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    updateHeight();
    viewport?.addEventListener('resize', updateHeight);
    viewport?.addEventListener('scroll', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    return () => {
      document.body.style.overflow = previousOverflow;
      root.style.removeProperty('--chat-viewport-height');
      viewport?.removeEventListener('resize', updateHeight);
      viewport?.removeEventListener('scroll', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [newMessage]);

  // 4. Send Message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending || !activeConvId) return;

    setIsSending(true);
    setSendError('');
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
        setMessages(prev => prev.some(message => message.id === data.id) ? prev : [...prev, data]);
        if (activeConvId !== 'global') fetchConversations(); // Update last message in sidebar
      } else {
        const err = await res.json().catch(() => ({}));
        setNewMessage(content);
        setSendError(err.error || t('chat.sendFailed'));
      }
    } catch {
      setNewMessage(content);
      setSendError(t('chat.offline'));
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
        setFindingUsers(false);
        fetchConversations();
        setView('chat');
      }
    } catch {}
  };

  // 7. Prijatelji (međusobno praćenje) za brzi početak razgovora
  useEffect(() => {
    if (!findingUsers || friends) return;
    fetch('/api/follow').then((res) => (res.ok ? res.json() : [])).then(setFriends).catch(() => setFriends([]));
  }, [findingUsers, friends]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  // 8. Block/Report
  const handleBlock = async () => {
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv || !activeConv.otherUser) return;
    if (!confirm(t('chat.blockConfirm', { name: activeConv.otherUser.name }))) return;

    try {
      const res = await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: activeConv.otherUser.id }),
      });
      if (res.ok) {
        setNotice(t('chat.blocked'));
        setActiveConvId('global');
        setView('list');
        fetchConversations();
      }
    } catch {}
  };

  const submitReport = async (reason: string, details: string) => {
    if (!reportTarget) return;
    const { kind, id } = reportTarget;
    try {
      const res = await fetch(kind === 'user' ? '/api/chat/report' : '/api/chat/global/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'user' ? { targetId: id, reason, details } : { messageId: id, reason: details ? `${reason}: ${details}` : reason }),
      });
      setNotice(res.ok ? t('chat.reportSent') : t('common.tryLater'));
    } catch {
      setNotice(t('common.tryLater'));
    }
    setReportTarget(null);
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  if (loading && !user) {
    return (
      <main className="page chat-wait" aria-busy="true">
        <Loader2 className="ic animate-spin" aria-hidden="true" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page">
        <div className="wrap ci">
          <span className="chat-guest__icon" aria-hidden="true"><MessageSquare /></span>
          <h1 className="h1">{t('chat.guestTitle')}</h1>
          <p className="lead" style={{ marginInline: 'auto' }}>{t('chat.guestText')}</p>
          <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto', marginTop: 28 }}>
            <Link className="btn btn--pink" href="/login?next=/chat">{t('nav.login')}</Link>
            <Link className="btn btn--ghost" href="/signup?reason=chat&next=/chat">{t('nav.signup')}</Link>
          </div>
        </div>
      </main>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);
  const isGlobal = activeConvId === 'global';
  const visibleConversations = conversations.filter(conv => {
    const haystack = `${conv.otherUser?.name || ''} ${conv.lastMessage?.content || ''}`.toLocaleLowerCase('bs');
    return haystack.includes(conversationQuery.trim().toLocaleLowerCase('bs'));
  });
  const open = (id: string) => { setActiveConvId(id); setView('chat'); };
  const personList = (people: User[]) => people.map(u => (
    <li key={u.id}>
      <button type="button" className="chat__person" onClick={() => startNewChat(u.id)}>
        <Avatar name={u.name} url={u.avatarUrl} className="row__av" /><b>{u.name}</b>
      </button>
    </li>
  ));

  return (
    <div ref={shellRef} className="chat-shell chat" data-view={view}>
      {/* --- Lista razgovora --- */}
      <aside className="chat__side" aria-label={t('chat.title')}>
        <div className="chat__sidehead">
          <div className="chat__titlerow">
            <h1 className="h2">{t('chat.title')}</h1>
            <button type="button" onClick={() => setFindingUsers(value => !value)} className={`chat__iconbtn${findingUsers ? ' is-on' : ''}`} aria-expanded={findingUsers} aria-label={t('chat.newChat')} title={t('chat.newChat')}>
              {findingUsers ? <X aria-hidden="true" /> : <PenSquare aria-hidden="true" />}
            </button>
          </div>

          {findingUsers ? (
            <label className="chat__search">
              <Search aria-hidden="true" />
              <span className="sr-only">{t('chat.findPeople')}</span>
              <input className="input" autoFocus type="search" placeholder={t('chat.findPeople')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
          ) : (
            <label className="chat__search">
              <Search aria-hidden="true" />
              <span className="sr-only">{t('chat.searchChats')}</span>
              <input className="input" type="search" value={conversationQuery} onChange={e => setConversationQuery(e.target.value)} placeholder={t('chat.searchChats')} />
            </label>
          )}
        </div>

        {findingUsers ? (
          <div className="chat__list">
            {searchQuery.length >= 2 ? (
              <ul className="chat__people">
                {isSearching ? <li className="chat__muted"><Loader2 className="ic animate-spin" aria-hidden="true" /> {t('chat.searching')}</li>
                  : searchResults.length === 0 ? <li className="chat__muted">{t('chat.noPeople')}</li>
                  : personList(searchResults)}
              </ul>
            ) : (
              <>
                <p className="chat__label"><Users aria-hidden="true" />{t('chat.friends')}</p>
                <ul className="chat__people">
                  {friends === null ? <li className="chat__muted"><Loader2 className="ic animate-spin" aria-hidden="true" /></li>
                    : friends.length === 0 ? <li className="chat__muted">{t('chat.noFriends')}</li>
                    : personList(friends)}
                </ul>
              </>
            )}
          </div>
        ) : (
          <ul className="chat__list">
            <li>
              <button type="button" onClick={() => open('global')} className="chat__item" aria-current={isGlobal ? 'true' : undefined}>
                <span className="row__av chat__globe" aria-hidden="true"><Globe /></span>
                <span className="chat__itemtext"><b>{t('chat.global')}</b><small>{t('chat.globalSub')}</small></span>
              </button>
            </li>
            {conversations.length === 0 ? (
              <li className="chat__muted chat__none">{t('chat.noChats')}</li>
            ) : visibleConversations.map((conv) => (
              <li key={conv.id}>
                <button type="button" onClick={() => open(conv.id)} className="chat__item" aria-current={activeConvId === conv.id ? 'true' : undefined}>
                  <Avatar name={conv.otherUser?.name} url={conv.otherUser?.avatarUrl} className="row__av" />
                  <span className="chat__itemtext">
                    <b>{conv.otherUser?.name ?? '—'}</b>
                    <small className={conv.unreadCount > 0 ? 'is-unread' : undefined}>{conv.lastMessage ? conv.lastMessage.content : t('chat.startHint')}</small>
                  </span>
                  <span className="chat__meta">
                    {conv.lastMessage && <time dateTime={conv.lastMessage.createdAt}>{time(conv.lastMessage.createdAt)}</time>}
                    {conv.unreadCount > 0 && <span className="chat__badge">{conv.unreadCount}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* --- Prozor razgovora --- */}
      <section className="chat__main" aria-label={isGlobal ? t('chat.global') : activeConv?.otherUser?.name}>
        {activeConvId ? (
          <>
            <header className="chat__head">
              <button type="button" onClick={() => setView('list')} className="chat__iconbtn chat__back" aria-label={t('chat.back')}><ArrowLeft aria-hidden="true" /></button>
              {isGlobal
                ? <span className="row__av chat__globe" aria-hidden="true"><Globe /></span>
                : <Avatar name={activeConv?.otherUser?.name} url={activeConv?.otherUser?.avatarUrl} className="row__av" />}
              <div className="chat__who">
                {isGlobal || !activeConv?.otherUser
                  ? <b>{isGlobal ? t('chat.global') : '—'}</b>
                  : <Link href={`/u/${activeConv.otherUser.id}`}><b>{activeConv.otherUser.name}</b></Link>}
                <small>{isGlobal ? t('chat.globalSub') : t('chat.private')}</small>
              </div>
              {!isGlobal && activeConv?.otherUser && (
                <div className="chat__tools">
                  <button type="button" onClick={() => setReportTarget({ kind: 'user', id: activeConv.otherUser!.id })} className="chat__iconbtn" aria-label={t('chat.reportUser')} title={t('chat.reportUser')}><ShieldAlert aria-hidden="true" /></button>
                  <button type="button" onClick={handleBlock} className="chat__iconbtn chat__iconbtn--danger" aria-label={t('chat.block')} title={t('chat.block')}><Ban aria-hidden="true" /></button>
                </div>
              )}
            </header>

            <div ref={messagesRef} onScroll={e => { const el = e.currentTarget; nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; if (nearBottomRef.current) setHasNewMessages(false); }} className="chat__msgs" role="log" aria-live="polite">
              {messages.length === 0 ? (
                <div className="empty chat__empty"><b>{isGlobal ? t('chat.global') : activeConv?.otherUser?.name}</b>{t('chat.startHint')}</div>
              ) : messages.map((m, index) => {
                const mine = m.senderId === user.id;
                const prev = messages[index - 1];
                const newDay = index === 0 || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const grouped = !newDay && prev?.senderId === m.senderId;
                const showAuthor = !mine && isGlobal;
                return (
                  <React.Fragment key={m.id}>
                    {newDay && <div className="chat__day"><span>{new Date(m.createdAt).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>}
                    <div className={`msg${mine ? ' msg--mine' : ''}${grouped ? ' msg--grouped' : ''}`}>
                      {showAuthor && (grouped
                        ? <span className="msg__avspace" aria-hidden="true" />
                        : <Link href={`/u/${m.senderId}`} className="msg__av" tabIndex={-1} aria-hidden="true"><Avatar name={m.sender?.name} url={m.sender?.avatarUrl} className="row__av" /></Link>)}
                      <div className="msg__col">
                        {showAuthor && !grouped && (
                          <p className="msg__name">
                            <Link href={`/u/${m.senderId}`}>{m.sender?.name}</Link>
                            {m.sender?.role === 'OWNER' && <span className="msg__role">{t('chat.roleOwner')}</span>}
                            {m.sender?.role === 'ADMIN' && <span className="msg__role msg__role--admin">{t('chat.roleAdmin')}</span>}
                          </p>
                        )}
                        <div className="msg__bubble">
                          {m.type === 'EVENT_SHARE' && m.sharedEvent ? (
                            <Link href={`/events/${m.sharedEvent.slug}`} className="msg__share">
                              <img src={m.sharedEvent.imageUrl || m.sharedEvent.venue?.imageUrl || '/logo.svg'} alt="" loading="lazy" decoding="async" />
                              <span className="msg__sharebody">
                                <b>{m.sharedEvent.title}</b>
                                {m.sharedEvent.venue?.name && <small><MapPin aria-hidden="true" />{m.sharedEvent.venue.name}</small>}
                                <small><Calendar aria-hidden="true" />{new Date(m.sharedEvent.startDateTime).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {time(m.sharedEvent.startDateTime)}</small>
                                <em>{t('chat.viewEvent')} →</em>
                              </span>
                            </Link>
                          ) : m.type === 'VENUE_SHARE' && m.sharedVenue ? (
                            <Link href={`/venues/${m.sharedVenue.slug}`} className="msg__share">
                              <img src={m.sharedVenue.imageUrl || '/logo.svg'} alt="" loading="lazy" decoding="async" />
                              <span className="msg__sharebody">
                                <b>{m.sharedVenue.name}</b>
                                <small><MapPin aria-hidden="true" />{m.sharedVenue.city}</small>
                                <em>{t('chat.viewVenue')} →</em>
                              </span>
                            </Link>
                          ) : m.type === 'EVENT_SHARE' || m.type === 'VENUE_SHARE' ? (
                            <i className="msg__gone">{t('chat.unavailable')}</i>
                          ) : (
                            m.content
                          )}
                        </div>
                        <p className="msg__time">
                          <time dateTime={m.createdAt}>{time(m.createdAt)}</time>
                          {showAuthor && <button type="button" className="msg__report" onClick={() => setReportTarget({ kind: 'message', id: m.id })}>{t('chat.report')}</button>}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {hasNewMessages && <button type="button" onClick={() => scrollToLatest()} className="chat__new"><ChevronDown aria-hidden="true" />{t('chat.newMessages')}</button>}
            <div className="chat-composer chat__composer">
              <form onSubmit={handleSend} className="chat__form">
                <label className="sr-only" htmlFor="chat-input">{t('chat.placeholder')}</label>
                <textarea
                  id="chat-input"
                  ref={composerRef}
                  placeholder={t('chat.placeholder')}
                  rows={1}
                  maxLength={2000}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="submit" className="chat__send" disabled={isSending || !newMessage.trim()} aria-label={t('chat.send')}>
                  {isSending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                </button>
              </form>
              {sendError && <p className="chat__error" role="alert">{sendError}</p>}
            </div>
          </>
        ) : (
          <div className="chat__placeholder">
            <div className="empty"><b>{t('chat.emptyTitle')}</b>{t('chat.emptyText')}</div>
          </div>
        )}
      </section>

      {reportTarget && <ReportDialog kind={reportTarget.kind} onCancel={() => setReportTarget(null)} onSubmit={submitReport} />}
      {notice && <p className="chat__toast" role="status">{notice}</p>}
    </div>
  );
}

const REASONS = ['spam', 'harassment', 'inappropriate', 'other'] as const;

/** Prijava korisnika ili poruke — umjesto prompt() prozora */
function ReportDialog({ kind, onCancel, onSubmit }: { kind: 'user' | 'message'; onCancel: () => void; onSubmit: (reason: string, details: string) => Promise<void> }) {
  const { t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<(typeof REASONS)[number]>('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { ref.current?.showModal(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSubmit(t(`chat.reasons.${reason}`), details.trim());
  };

  return (
    <dialog ref={ref} className="vgate" aria-labelledby="report-title" onClose={onCancel} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <form className="vgate__card chat-report" onSubmit={submit}>
        <button type="button" className="vgate__close" onClick={onCancel} aria-label={t('common.close')}><X aria-hidden="true" /></button>
        <p className="kicker">{kind === 'user' ? t('chat.reportUser') : t('chat.reportMessage')}</p>
        <h2 id="report-title" className="h2">{t('chat.reportTitle')}</h2>
        <div className="chat-report__reasons" role="radiogroup">
          {REASONS.map((r) => (
            <button key={r} type="button" role="radio" aria-checked={reason === r} className={`chip${reason === r ? ' is-on' : ''}`} onClick={() => setReason(r)}>{t(`chat.reasons.${r}`)}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="report-details">{t('chat.reportDetails')}</label>
        <textarea id="report-details" className="input" rows={3} maxLength={500} placeholder={t('chat.reportDetails')} value={details} onChange={(e) => setDetails(e.target.value)} />
        <div className="vgate__actions">
          <button type="submit" className="btn btn--pink" disabled={busy}>{busy ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <ShieldAlert className="ic" aria-hidden="true" />}{t('chat.reportSend')}</button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('chat.cancel')}</button>
        </div>
      </form>
    </dialog>
  );
}
