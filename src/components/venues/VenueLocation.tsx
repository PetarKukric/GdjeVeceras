'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import {  ExternalLink } from 'lucide-react';
import { Venue } from '@/types';

const VenueMap = dynamic(() => import('@/components/map/VenueMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-card border border-border rounded-3xl animate-pulse flex items-center justify-center text-muted uppercase text-[10px] font-bold tracking-widest">Učitavanje mape...</div>
});

export function VenueLocation({ venue, hideHeader = false }: { venue: Venue, hideHeader?: boolean }) {
  const mapUrl = venue.latitude && venue.longitude 
    ? `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address} ${venue.city || ''}`)}`;

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
           <div className="w-8 h-px bg-primary" /> LOKACIJA
        </h2>
      )}
      <div className={`bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-2xl ${hideHeader ? 'border-none shadow-none bg-transparent' : ''}`}>
         <div className="aspect-video bg-surface relative z-0">
            {venue.latitude && venue.longitude ? (
              <VenueMap venue={venue} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-border text-6xl opacity-10">🗺️</div>
            )}
         </div>
         <div className="p-8">
            <h3 className="font-black text-white mb-2 uppercase tracking-tight text-xl">{venue.name}</h3>
            <p className="text-xs text-muted mb-8 uppercase tracking-widest font-bold">{venue.address}, {venue.city}</p>
            <a 
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-primary-hover transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
            >
              POKRENI NAVIGACIJU <ExternalLink size={16} />
            </a>
         </div>
      </div>
    </div>
  );
}
