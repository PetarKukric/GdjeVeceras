'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EventFilters } from '@/components/search/EventFilters';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { Category } from '@/types';
import dynamic from 'next/dynamic';
import { Map as MapIcon, LayoutGrid, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCityBySlug } from '@/lib/cities';
import { useLang } from '@/components/i18n/LangProvider';
import { readSavedCity, saveCity } from '@/lib/city-preference';

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
  loading: () => <div className="skel" style={{ minHeight: 500 }} />
});

function EventsContent() {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(searchParams.get('view') === 'map' ? 'map' : 'grid');
  useEffect(() => { setViewMode(searchParams.get('view') === 'map' ? 'map' : 'grid'); }, [searchParams]);
  const changeView = (view:'grid'|'map') => { setViewMode(view); const params = new URLSearchParams(searchParams.toString()); params.set('view',view); router.replace('/events?'+params.toString(), {scroll:false}); };
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

  useEffect(() => {
    const explicitCity = searchParams.get('city');
    if (searchParams.has('city')) {
      saveCity(explicitCity || '');
      return;
    }
    const savedCity = readSavedCity();
    if (savedCity) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('city', savedCity);
      router.replace(`/events?${params.toString()}`, { scroll: false });
    }
  }, [router, searchParams]);

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
    params.set('view', viewMode);
    params.set('city', newFilters.city);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (!value || value === 'ALL' || value === 'startTime' || value === 'all') return;
      params.set(key, value as string);
    });
    saveCity(newFilters.city);
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="wrap page">
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <p className="kicker">{t('eventsPage.kicker')}</p>
          <h1 className="h1">{t('eventsPage.title')}</h1>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-8 gap-4">
        <div className="flex-grow w-full md:w-auto min-w-0">
          <EventFilters
            initialFilters={currentFilters}
            onFilterChange={handleFilterChange}
            venues={venues}
          />
        </div>

        <div className="seg" style={{ marginTop: 0 }} role="group" aria-label={t('eventsPage.viewAria')}>
          <button type="button" className="seg__btn" aria-pressed={viewMode === 'grid'} onClick={() => changeView('grid')}>
            <LayoutGrid size={16} aria-hidden="true" />&nbsp;{t('eventsPage.list')}
          </button>
          <button type="button" className="seg__btn" aria-pressed={viewMode === 'map'} onClick={() => changeView('map')}>
            <MapIcon size={16} aria-hidden="true" />&nbsp;{t('eventsPage.map')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="events">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skel" />)}
        </div>
      ) : error ? (
        <div className="empty">
          <b>{t('home.loadError')}</b>
          <button onClick={() => window.location.reload()} className="btn btn--pink btn--sm" style={{ marginTop: 12 }}>{t('common.retry')}</button>
        </div>
      ) : data?.events.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('eventsPage.noResults')}
          description={t('eventsPage.noResultsText')}
          actionHref="/events"
          actionLabel={t('filters.reset')}
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="events">
              {data?.events.map((event, index) => (
                <EventCard
                  key={`${event.id}-${event.occurrenceDate || ''}`}
                  index={index}
                  event={event}
                  isFavoritedInitial={favoriteEventIds.includes(event.id)}
                />
              ))}
            </div>
          ) : (
            <div className="h-[600px] rounded-3xl overflow-hidden border border-border">
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
      <main className="flex-grow">
        <Suspense fallback={<div className="wrap page"><div className="skel" /></div>}>
          <EventsContent />
        </Suspense>
      </main>
    </div>
  );
}
