'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Heart, Zap } from 'lucide-react';
import { Event } from '@/types';
import Link from 'next/link';
import { POPULARITY_THRESHOLD } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';

interface EventCardProps {
  event: Event;
  isFavoritedInitial?: boolean;
  onFavoriteToggle?: (eventId: string, favorited: boolean) => void;
  showPopularBadge?: boolean;
}

export function EventCard({ event, isFavoritedInitial = false, onFavoriteToggle, showPopularBadge = true }: EventCardProps) {
  const [isFavorited, setIsFavorited] = useState(isFavoritedInitial);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();

  const favoriteCount = event._count?.favorites || 0;
  const isPopular = favoriteCount >= POPULARITY_THRESHOLD;
  const isPromoted = event.promoted || (event.promotions && event.promotions.some((p: any) => p.status === 'ACTIVE' && new Date(p.endAt) >= new Date()));
  const liveMediaCount = event._count?.liveMedia || 0;
  const isLiveNow = mounted && new Date() >= new Date(event.startDateTime) && new Date() <= new Date(event.endDateTime) && liveMediaCount > 0;

  useEffect(() => {
    setMounted(true);
    setIsFavorited(isFavoritedInitial);
  }, [isFavoritedInitial]);

  const startDate = new Date(event.startDateTime);
  
  const formattedTime = (date: Date) => date.toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' });

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingFavorite) return;
    setLoadingFavorite(true);
    
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        window.location.href = '/login';
        return;
      }
      const session = await sessionRes.json();
      
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, eventId: event.id })
      });
      
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.favorited);
        showToast(data.favorited ? 'Događaj sačuvan' : 'Uklonjeno iz sačuvanih');
        if (onFavoriteToggle) onFavoriteToggle(event.id, data.favorited);
      } else {
        if (res.status === 401) {
          window.location.href = '/login';
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error('Favorite toggle failed:', errorData);
        }
      }
    } catch (err) {
      console.error('Favorite error:', err);
    } finally {
      setLoadingFavorite(false);
    }
  };

  return (
    <Link href={`/events/${event.slug}`} className="bg-surface border border-white/5 rounded-[2rem] overflow-hidden hover:border-primary/40 hover:-translate-y-2 transition-all duration-500 group cursor-pointer shadow-2xl hover:shadow-primary/5 flex flex-col h-full text-left relative">
      
      {/* IMAGE SECTION */}
      <div className="aspect-[16/10] relative overflow-hidden">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-surface to-background flex items-center justify-center">
            <span className="text-4xl opacity-20">{event.category === 'PARTY' ? '💿' : '🎸'}</span>
          </div>
        )}
        
        {/* Badge Top Left */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {isLiveNow && (
             <span className="bg-red-500 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 flex items-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.6)] w-fit animate-pulse">
               <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> UŽIVO
             </span>
          )}
          {isPromoted && (
            <span className="bg-primary backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 flex items-center gap-1 shadow-[0_0_15px_rgba(255,0,128,0.4)] w-fit">
              <Zap size={10} fill="currentColor" /> ISTAKNUTO
            </span>
          )}
          <span className="bg-primary/90 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 w-fit">
            {event.category === 'PARTY' ? 'ŽURKA' : 'MUZIKA UŽIVO'}
          </span>
          {isPopular && showPopularBadge && (
            <span className="bg-accent/90 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 flex items-center gap-1 shadow-lg shadow-accent/20 w-fit animate-pulse">
              🔥 POPULARNO
            </span>
          )}
          {event.recommendationReason && (
             <span className="bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 flex items-center gap-1 shadow-lg shadow-purple-500/20 w-fit animate-pulse">
               ✨ {event.recommendationReason}
             </span>
          )}
          {event.dressCodeType && event.dressCodeType !== 'NONE' && (
             <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white border border-white/10 w-fit">
               {event.dressCodeType === 'SPECIAL' ? event.dressCodeName : 
                event.dressCodeType === 'ELEGANT' ? 'ELEGANTNO' : event.dressCodeType}
             </span>
          )}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-2">
           <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
             {formattedTime(startDate)}
           </p>
           <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors leading-tight mb-2 uppercase tracking-tight line-clamp-1">
            {event.title}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted text-[9px] font-bold uppercase tracking-widest truncate">
               <MapPin size={10} className="text-primary" /> {event.venue?.name || 'Nepoznata lokacija'}
            </div>
            <div className="flex items-center gap-1.5 text-muted text-[9px] font-bold uppercase tracking-widest">
               <MapPin size={10} className="text-primary" /> {event.venue?.city || ''}
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center border-t border-white/5">
           <div className="flex items-center gap-3">
             <div className="text-[10px] font-black text-white bg-white/5 px-2.5 py-1 rounded-md">
               {event.price === 0 ? 'BESPLATNO' : `${event.price} KM`}
             </div>
             {favoriteCount > 0 && (
               <div className="text-[8px] font-black text-muted flex items-center gap-1 uppercase tracking-widest opacity-60">
                  <Heart size={8} fill="currentColor" className="text-primary" /> {favoriteCount}
               </div>
             )}
           </div>
           <button 
            disabled={loadingFavorite}
            className={`p-2 rounded-xl transition-all hover:bg-white/5 ${isFavorited ? 'text-primary scale-110' : 'text-muted hover:text-primary'}`}
            onClick={toggleFavorite}
          >
            <Heart size={18} fill={isFavorited ? "currentColor" : "none"} className="transition-transform active:scale-125" />
          </button>
        </div>
      </div>
    </Link>
  );
}
