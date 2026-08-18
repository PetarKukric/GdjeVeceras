'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventFilters } from '@/components/search/EventFilters';
import { EventCard } from '@/components/events/EventCard';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import { useEvents } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { Category } from '@/types';
import dynamic from 'next/dynamic';
import { Map as MapIcon, LayoutGrid, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCityBySlug } from '@/lib/cities';

interface FilterState {
  search: string;
  category: Category | 'ALL';
  date: string;
  priceRange: string;
  venue: string;
  city: string;
  sort: string;
}

// Dynamic import for the Map to avoid SSR issues with Leaflet
const EventMap = dynamic(() => import('@/components/map/EventMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-card border border-border rounded-3xl animate-pulse flex items-center justify-center">Učitavanje mape...</div>
});

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [favoriteEventIds, setFavoriteEventIds] = useState<string[]>([]);

  // Sync favorites
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const favRes = await fetch(`/api/favorites?userId=${session.user.id}`);
          if (favRes.ok) {
            const data = await favRes.json();
            setFavoriteEventIds(data.eventIds || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    }
    fetchFavorites();
  }, []);

  // Parse filters from URL
  const currentFilters = useMemo<FilterState>(() => ({
    search: searchParams.get('search') || '',
    category: (searchParams.get('category') as Category | 'ALL') || 'ALL',
    date: searchParams.get('date') || 'all',
    priceRange: searchParams.get('priceRange') || 'ALL',
    venue: searchParams.get('venue') || '',
    city: searchParams.get('city') || '',
    sort: searchParams.get('sort') || 'startTime',
  }), [searchParams]);

  // Handle geolocation when distance sort is selected
  useEffect(() => {
    if (currentFilters.sort === 'distance' && !coords) {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (err) => {
            console.error("Geolocation error:", err);
            // Fallback to default map center if permission denied or error
            setCoords({ lat: 45.1448, lng: 17.2543 });
          }
        );
      }
    }
  }, [currentFilters.sort, coords]);

  // Derived price filters
  const priceRange = useMemo(() => {
    if (currentFilters.priceRange === 'ALL') return { min: undefined, max: undefined };
    const [min, max] = currentFilters.priceRange.split('-').map(Number);
    return { min, max };
  }, [currentFilters.priceRange]);

  const { data, loading, error } = useEvents({
    search: currentFilters.search,
    category: currentFilters.category,
    date: currentFilters.date,
    venue: currentFilters.venue,
    city: currentFilters.city,
    minPrice: priceRange.min,
    maxPrice: priceRange.max,
    sort: currentFilters.sort,
    lat: currentFilters.sort === 'distance' ? coords?.lat : undefined,
    lng: currentFilters.sort === 'distance' ? coords?.lng : undefined,
    limit: 50
  });

  const { data: venues } = useVenues();

  const handleFilterChange = (newFilters: FilterState) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'ALL' && value !== 'today' && value !== 'startTime') {
        params.append(key, value as string);
      } else if (key === 'date' && value !== 'today') {
         params.append(key, value as string);
      } else if (key === 'category' && value !== 'ALL') {
         params.append(key, value as string);
      }
    });
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div className="flex-grow w-full md:w-auto">
          <EventFilters 
            initialFilters={currentFilters} 
            onFilterChange={handleFilterChange}
            venues={venues}
          />
        </div>
        
        <div className="flex bg-card border border-border rounded-xl p-1 shrink-0">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-primary text-text shadow-lg' : 'text-muted hover:text-text'}`}
          >
            <LayoutGrid size={16} /> GRID
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-primary text-text shadow-lg' : 'text-muted hover:text-text'}`}
          >
            <MapIcon size={16} /> MAPA
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <EventCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <p className="text-red-400 font-bold mb-4">Ups! Greška pri učitavanju.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-text font-bold rounded-full">Pokušaj ponovo</button>
        </div>
      ) : data?.events.length === 0 ? (
        <EmptyState 
          icon={Search} 
          title="Nema rezultata" 
          description="Nismo pronašli nijedan događaj koji odgovara vašim filterima. Pokušajte sa drugim datumom ili kategorijom."
          actionHref="/events"
          actionLabel="PONIŠTI SVE FILTERE"
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data?.events.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  isFavoritedInitial={favoriteEventIds.includes(event.id)}
                />
              ))}
            </div>
          ) : (
            <div className="h-[600px]">
              <EventMap
                events={data?.events || []}
                center={getCityBySlug(currentFilters.city) ? [getCityBySlug(currentFilters.city)!.lat, getCityBySlug(currentFilters.city)!.lng] : undefined}
                centerKey={currentFilters.city || 'all'}
                zoom={getCityBySlug(currentFilters.city)?.zoom || 8}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow pb-24">
        <Suspense fallback={<div className="p-8 text-center">Učitavanje...</div>}>
          <EventsContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
}
