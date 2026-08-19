'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, Clock, Zap, Camera} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';

export function NotificationBell({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.unreadCount > unreadCount && unreadCount !== 0) {
            showToast('Nova obavijest primljena', 'info');
        }
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      console.error('Failed to fetch notifications');
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Polling every 30 seconds for simplicity as requested
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="touch-target p-2 text-muted hover:text-primary transition-all relative group"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-swing' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed right-3 top-16 md:absolute md:top-auto md:right-0 md:mt-4 w-80 max-w-[calc(100vw-24px)] bg-card border border-border shadow-2xl rounded-3xl overflow-hidden z-[600] animate-in fade-in slide-in-from-top-2">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Obavijesti</h4>
            {unreadCount > 0 && (
              <span className="text-[9px] font-black text-primary uppercase">{unreadCount} nove</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-muted text-xs font-medium">
                Nemate novih obavijesti.
              </div>
            ) : (
              notifications.map((n) => {
                const isPromotion = n.type === 'PROMOTED_EVENT';
                const isLiveUpdate = n.type === 'EVENT_LIVE_UPDATE';
                const href = (isPromotion || isLiveUpdate) ? `/events/${n.event?.slug}${isLiveUpdate ? '#live-feed' : ''}` : `/admin/messages/${n.messageId}`;
                const Icon = isLiveUpdate ? Camera : (isPromotion ? Zap : MessageSquare);
                
                return (
                  <Link
                    key={n.id}
                    href={href}
                    onClick={() => {
                      setIsOpen(false);
                      markAsRead(n.id);
                    }}
                    className={`p-5 flex gap-4 hover:bg-surface transition-all border-b border-border/50 group ${!n.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-muted'}`}>
                      {isLiveUpdate ? <Camera size={18} fill="currentColor" /> : (isPromotion ? <Zap size={18} fill="currentColor" /> : <Icon size={18} />)}
                    </div>
                    <div className="flex-grow overflow-hidden">
                      {isPromotion && !n.isRead && (
                        <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-1 block">Sponzorisano</span>
                      )}
                      {isLiveUpdate && !n.isRead && (
                        <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.2em] mb-1 block">Uživo</span>
                      )}
                      <p className={`text-xs uppercase tracking-tight truncate ${!n.isRead ? 'text-white font-black' : 'text-muted font-bold'}`}>
                        {n.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-muted text-[9px] font-bold uppercase tracking-widest">
                        <Clock size={10} />
                        {new Date(n.createdAt).toLocaleDateString('bs')}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0 shadow-[0_0_8px_#FF0080]" />
                    )}
                  </Link>
                );
              })
            )}
          </div>

          <Link 
            href="/admin/messages" 
            onClick={() => setIsOpen(false)}
            className="p-4 block text-center text-[10px] font-black text-primary hover:text-white transition-colors bg-surface/50 uppercase tracking-widest"
          >
            Pogledaj sve poruke →
          </Link>
        </div>
      )}
    </div>
  );
}
