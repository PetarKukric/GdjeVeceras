'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { VenueCard } from '@/components/venues/VenueCard';
import { useVenues } from '@/hooks/useVenues';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapPin } from 'lucide-react';
import { VenueCardSkeleton } from '@/components/ui/Skeleton';
import { getCityBySlug } from '@/lib/cities';

function VenuesContent() {
  const searchParams = useSearchParams();
  const citySlug = searchParams.get('city') || '';
  const city = getCityBySlug(citySlug);
  const { data: venues, loading } = useVenues({ city: citySlug });
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);

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
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">Svi lokali{city ? <> u <span className="text-primary">{city.locative}</span></> : null} 🏢</h1>
          <p className="text-muted text-sm font-medium max-w-xl mx-auto md:mx-0">Istražite najbolja mjesta za izlazak, koncerte i žurke.</p>
        </header>

        {loading ? (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {venues.map((venue) => (
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
