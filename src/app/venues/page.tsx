'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { VenueCard } from '@/components/venues/VenueCard';
import { useVenues } from '@/hooks/useVenues';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapPin, Search } from 'lucide-react';
import { VenueCardSkeleton } from '@/components/ui/Skeleton';
import { getCityBySlug } from '@/lib/cities';

function VenuesContent() {
  const searchParams = useSearchParams();
  const citySlug = searchParams.get('city') || '';
  const city = getCityBySlug(citySlug);
  const { data: venues, loading } = useVenues({ city: citySlug });
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVenues = (venues || []).filter((v: any) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [v.name, v.city, v.address].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const favRes = await fetch(`/api/favorites?userId=${session.user.id}`);
          if (favRes.ok) {
            const data = await favRes.json();
            setFavoriteVenueIds(data.venueIds || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    }
    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-7xl mx-auto px-4 py-16 w-full pb-32 animate-fade-up">
        <header className="mb-16 text-center md:text-left">
          <div className="bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 mx-auto md:mx-0">
             Discover Places
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">Svi lokali{city ? <> u <span className="text-primary">{city.locative}</span></> : null}</h1>
          <p className="text-muted text-sm font-medium max-w-xl mx-auto md:mx-0">Istražite najbolja mjesta za izlazak, koncerte i žurke.</p>
        </header>

        {/* PRETRAGA LOKALA */}
        <div className="mb-10 max-w-xl mx-auto md:mx-0 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pretraži lokale (naziv, grad, adresa)..."
            aria-label="Pretraga lokala"
            className="w-full h-14 bg-surface border border-border rounded-2xl pl-12 pr-4 text-sm font-medium text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {loading ? (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm font-black uppercase tracking-widest">
            Nema lokala za pretragu &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {filteredVenues.map((venue) => (
              <VenueCard 
                key={venue.id} 
                venue={venue} 
                isFavoritedInitial={favoriteVenueIds.includes(venue.id)}
              />
            ))}
          </div>
        )}

        {venues.length === 0 && !loading && (
          <EmptyState 
            icon={MapPin} 
            title="Nema lokala" 
            description="Trenutno nema registrovanih lokala u bazi podataka."
          />
        )}
      </main>
      <BottomNav />
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VenuesContent />
    </Suspense>
  );
}
