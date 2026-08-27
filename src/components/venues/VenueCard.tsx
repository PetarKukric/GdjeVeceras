'use client';

import React, { useState, useEffect } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { Venue } from '@/types';
import Link from 'next/link';
import { getVenueStatus } from '@/lib/venue-utils';
import { POPULARITY_THRESHOLD } from '@/lib/constants';

interface VenueCardProps {
  venue: Venue;
  isFavoritedInitial?: boolean;
  onFavoriteToggle?: (venueId: string, favorited: boolean) => void;
}

export function VenueCard({ venue, isFavoritedInitial = false }: VenueCardProps) {
  const [, setIsFavorited] = useState(isFavoritedInitial);
  const [venueStatus, setVenueStatus] = useState<any>(null);

  const favoriteCount = venue._count?.favorites || 0;
  const isPopular = favoriteCount >= POPULARITY_THRESHOLD;

  useEffect(() => {
    setIsFavorited(isFavoritedInitial);
  }, [isFavoritedInitial]);

  useEffect(() => {
    if (venue.openingHours) {
      setVenueStatus(getVenueStatus(venue.openingHours as any));
    }
  }, [venue.openingHours]);

  return (
    <Link href={`/venues/${venue.slug}`} className="bg-surface border border-border/50 rounded-[1.5rem] overflow-hidden hover:border-primary/50 transition-all group cursor-pointer shadow-2xl flex flex-col relative h-full">
      
      <div className="aspect-[1.8/1] bg-surface relative overflow-hidden">
        {venue.imageUrl ? (
          <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-border bg-gradient-to-br from-surface to-card">
            <span className="text-4xl opacity-10 group-hover:scale-110 transition-transform duration-700">🏢</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
        
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {isPopular && (
            <span className="bg-accent/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] text-white border border-white/10 flex items-center gap-1 shadow-lg shadow-accent/20 animate-pulse w-fit">
              🔥 POPULARNO
            </span>
          )}
        </div>
      </div>
      
      <div className="p-5 sm:p-6 flex flex-col flex-grow">
        <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors leading-snug mb-2 truncate uppercase tracking-tight">
          {venue.name}
        </h3>
        <p className="text-muted text-[10px] font-bold flex items-center gap-1.5 mb-4 uppercase tracking-widest">
          {venue.city}
        </p>
        
        {venueStatus && (
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${venueStatus.status === 'OPEN' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${venueStatus.status === 'OPEN' ? 'text-green-500' : 'text-red-500'}`}>
                {venueStatus.label}
              </span>
            </div>
            {venueStatus.subLabel && (
              <span className="text-[7px] font-bold text-muted uppercase tracking-widest ml-4">
                {venueStatus.subLabel}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-5 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col gap-1">
             <span className="text-[7px] font-black text-muted uppercase tracking-[0.2em] opacity-60">
               {venue._count?.events || 0} AKTIVNIH DOGAĐAJA
             </span>
             {favoriteCount > 0 && (
               <span className="text-[7px] font-black text-accent uppercase tracking-[0.2em] flex items-center gap-1">
                 <Heart size={8} fill="currentColor" /> {favoriteCount} SAČUVANO
               </span>
             )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all shadow-lg">
             <ArrowRight size={14} className="text-muted group-hover:text-white transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
