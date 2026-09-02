'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Heart, Flame, Sparkles, Music2, Mic2 } from 'lucide-react';
import { Event } from '@/types';
import Link from 'next/link';
import { POPULARITY_THRESHOLD } from '@/lib/constants';
import { useToast } from '@/components/ui/Toast';
import { formatSerbianDate } from '@/lib/date-format';

interface EventCardProps {
  event: Event;
  isFavoritedInitial?: boolean;
  onFavoriteToggle?: (eventId: string, favorited: boolean) => void;
  showPopularBadge?: boolean;
}

function CategoryArtwork({ category }: { category: Event['category'] }) {
  if (category === 'PARTY') {
    return (
      <svg viewBox="0 0 320 190" className="h-full w-full text-primary" aria-hidden="true">
        <defs>
          <linearGradient id="party-beam-left" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="party-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0.28" />
          </linearGradient>
        </defs>
        <path d="M82 18 44 142h92L101 18Z" fill="url(#party-beam-left)" opacity=".48" />
        <path d="m236 20-38 122h91L254 20Z" fill="url(#party-beam-left)" opacity=".6" />
        <ellipse cx="92" cy="18" rx="16" ry="8" fill="currentColor" transform="rotate(-18 92 18)" />
        <ellipse cx="246" cy="20" rx="16" ry="8" fill="currentColor" transform="rotate(18 246 20)" />
        <path d="M25 145c22-17 38-20 59-10 15-20 36-25 55-9 18-22 43-25 62-4 20-18 48-14 66 9 14-6 27-4 40 7v52H25Z" fill="url(#party-fade)" />
        <g fill="currentColor" opacity=".48">
          <circle cx="62" cy="133" r="12" /><circle cx="101" cy="124" r="13" /><circle cx="143" cy="131" r="12" />
          <circle cx="183" cy="120" r="14" /><circle cx="226" cy="130" r="12" /><circle cx="270" cy="126" r="13" />
          <path d="M52 143h20l8 47H42Zm39-7h22l10 54H80Zm42 6h21l8 48h-38Zm38-7h25l11 55h-48Zm45 7h22l8 48h-39Zm43-5h23l14 53h-47Z" />
          <path d="m92 119-17-37 7-3 20 37Zm19-1 13-42 7 2-10 45Zm64-2-5-49 8-1 9 50Zm21 0 24-39 7 4-19 42Zm58 5 15-38 7 3-11 42Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        </g>
        <g fill="currentColor">
          <circle cx="46" cy="47" r="2" /><circle cx="145" cy="30" r="2" /><circle cx="190" cy="50" r="2" />
          <circle cx="285" cy="46" r="2" /><path d="m169 20 7 4-5 6-6-4Zm101 38 8-2 2 6-8 3Z" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 190" className="h-full w-full text-primary" aria-hidden="true">
      <defs>
        <radialGradient id="live-glow">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.36" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="190" cy="92" r="90" fill="url(#live-glow)" />
      <circle cx="190" cy="92" r="67" fill="none" stroke="currentColor" strokeWidth="3" opacity=".72" />
      <circle cx="190" cy="92" r="74" fill="none" stroke="currentColor" strokeWidth="1" opacity=".2" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="177" cy="112" r="29" strokeWidth="4" opacity=".78" />
        <circle cx="143" cy="105" r="17" strokeWidth="3" opacity=".72" />
        <circle cx="213" cy="93" r="16" strokeWidth="3" opacity=".72" />
        <path d="M177 83v58m-30-18-9 35m80-48 13 47M126 88h38m56-17h32" strokeWidth="3" opacity=".72" />
        <path d="m237 135 39-83 9 4-39 83m-19 6 22 11 17-12-30-14Z" strokeWidth="4" />
        <path d="M259 80 284 92" strokeWidth="2" opacity=".55" />
        <path d="m105 82 11-43m0 0 17-4v29m-17-25 17-4" strokeWidth="4" />
        <path d="M94 86c0-7 6-12 13-12s12 4 12 10-6 11-14 11-11-4-11-9Zm28-20c0-6 5-10 11-10s10 4 10 9-5 10-11 10-10-4-10-9Z" fill="currentColor" stroke="none" />
      </g>
      <g fill="currentColor" opacity=".72">
        <path d="M64 52v33c-12-3-22 3-22 11 0 7 8 11 16 8 7-2 10-7 10-14V63l19-5v19c-11-2-20 3-20 11 0 7 7 11 15 9 7-2 10-7 10-14V45Z" />
        <path d="M281 34v25c-9-2-16 2-16 8 0 5 5 8 11 7 6-1 9-5 9-11V43l14-4v14c-8-1-14 3-14 8 0 6 6 8 12 6 5-1 7-5 7-10V29Z" />
      </g>
    </svg>
  );
}

export function EventCard({ event, isFavoritedInitial = false, onFavoriteToggle, showPopularBadge = true }: EventCardProps) {
  const [isFavorited, setIsFavorited] = useState(isFavoritedInitial);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();

  const favoriteCount = event._count?.favorites || 0;
  const isPopular = favoriteCount >= POPULARITY_THRESHOLD;
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

  const eventUrl = `/events/${event.slug}${event.occurrenceDate ? `?date=${event.occurrenceDate}` : ''}`;
  const dateLabel = formatSerbianDate(startDate);
  const priceLabel = !event.price ? 'BESPLATNO' : `${event.price} ${event.currency || 'KM'}`;

  return (
    <Link
      href={eventUrl}
      className="group relative flex min-h-[230px] h-full flex-col overflow-hidden rounded-[24px] border border-primary/30 bg-background text-left shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-primary/10"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.035] via-transparent to-primary/[0.035]" />
      <div className="pointer-events-none absolute right-0 top-0 h-[72%] w-[58%] opacity-90 transition-transform duration-500 group-hover:scale-105">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent z-10" />
        <CategoryArtwork category={event.category} />
      </div>

      <div className="relative z-20 flex flex-1 p-4 sm:p-5 pb-3">
        <div className="mr-[35%] flex min-w-0 flex-1 gap-3">
          <div className="w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_16px_currentColor]" aria-hidden="true" />
          <div className="min-w-0 py-0.5">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary tabular-nums">
              <span>{formattedTime(startDate)}</span>
              <span className="text-muted">{dateLabel}</span>
              {isLiveNow && <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] text-white animate-pulse">UŽIVO</span>}
            </div>

            <h3 className="mb-3 line-clamp-2 text-base sm:text-lg font-black uppercase leading-tight tracking-tight text-white transition-colors group-hover:text-primary">
              {event.title}
            </h3>

            <div className="space-y-1.5">
              {event.performers && (
                <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white">
                  <Mic2 size={12} className="shrink-0 text-primary" />
                  <span className="truncate">{event.performers}</span>
                </div>
              )}
              <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <MapPin size={12} className="shrink-0 text-primary" />
                <span className="truncate">{event.venue?.name || 'Nepoznata lokacija'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <MapPin size={12} className="shrink-0 text-primary" />
                <span className="truncate">{event.venue?.city || ''}</span>
              </div>
              {event.additionalVenues && event.additionalVenues.length > 0 && (
                <p className="line-clamp-1 pl-[18px] text-[9px] font-bold uppercase tracking-wider text-primary/80">
                  + {event.additionalVenues.map((item) => item.venue.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 flex min-h-16 items-center justify-between gap-3 border-t border-dashed border-white/10 px-4 sm:px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-xl border border-primary/60 bg-background/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">
            {priceLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary">
            <Music2 size={11} /> {event.category === 'PARTY' ? 'Žurka' : event.category === 'CONCERT' ? 'Koncert' : 'Muzika uživo'}
          </span>
          {isPopular && showPopularBadge && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-accent">
              <Flame size={10} /> Popularno
            </span>
          )}
          {event.recommendationReason && (
            <span className="inline-flex max-w-32 items-center gap-1 truncate text-[9px] font-black uppercase tracking-wider text-purple-400">
              <Sparkles size={10} className="shrink-0" /> {event.recommendationReason}
            </span>
          )}
          {event.dressCodeType && event.dressCodeType !== 'NONE' && (
            <span className="text-[9px] font-black uppercase tracking-wider text-muted">
              {event.dressCodeType === 'SPECIAL' ? event.dressCodeName : event.dressCodeType === 'ELEGANT' ? 'Elegantno' : event.dressCodeType}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-white/10 pl-3">
          {favoriteCount > 0 && <span className="text-[9px] font-black text-muted">{favoriteCount}</span>}
          <button
            disabled={loadingFavorite}
            aria-label={isFavorited ? 'Ukloni događaj iz sačuvanih' : 'Sačuvaj događaj'}
            aria-pressed={isFavorited}
            className={`touch-target flex items-center justify-center rounded-xl transition-all ${isFavorited ? 'text-primary' : 'text-muted hover:text-primary'}`}
            onClick={toggleFavorite}
          >
            <Heart size={22} fill={isFavorited ? 'currentColor' : 'none'} className="transition-transform active:scale-125" />
          </button>
        </div>
      </div>
    </Link>
  );
}
