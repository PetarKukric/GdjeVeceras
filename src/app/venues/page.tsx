'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { VenueCard } from '@/components/venues/VenueCard';
import { useVenues } from '@/hooks/useVenues';
import { EmptyState } from '@/components/ui/EmptyState';
import { MapPin, Search } from 'lucide-react';
import { VenueCardSkeleton } from '@/components/ui/Skeleton';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { readSavedCity, saveCity } from '@/lib/city-preference';
import { useRouter } from 'next/navigation';

function VenuesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const citySlug = searchParams.get('city') || '';
  const venueType = searchParams.get('type') || '';

  const { data: venues, loading, error } = useVenues({ city: citySlug, type: venueType });
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const updateFilter = (key:string, value:string) => {
    const params = new URLSearchParams(searchParams.toString()); params.set(key,value);
    if (key === 'city') saveCity(value);
    router.replace('/venues?'+params.toString(), {scroll:false});
  };

  const filteredVenues = (venues || []).filter((v: any) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [v.name, v.city, v.address].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  useEffect(() => {
    if (searchParams.has('city')) {
      saveCity(citySlug);
    } else {
      const saved = readSavedCity();
      if (saved) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('city', saved);
        router.replace(`/venues?${params.toString()}`, { scroll: false });
      }
    }

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
  }, [citySlug, router, searchParams]);

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-7xl mx-auto px-4 py-6 w-full pb-32 animate-fade-up">
        <header className="mb-5">
          <h1 className="text-[32px] font-bold mb-2">Lokali</h1>\n          <p className="text-muted text-sm font-medium max-w-xl mx-auto md:mx-0">Istražite najbolja mjesta za izlazak, koncerte i žurke.</p>
        </header>

        <div className="city-picker mb-4"><MapPin size={18}/><select aria-label="Izaberi grad" value={citySlug} onChange={e=>updateFilter('city',e.target.value)}><option value="">Svi gradovi</option>{SUPPORTED_CITIES.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
        <div className="flex gap-2 overflow-x-auto mb-4" aria-label="Tip lokala">{[['','Svi'],['clubs','Klubovi'],['bars','Kafići / Barovi']].map(([value,label])=><button key={value} aria-pressed={venueType===value} onClick={()=>updateFilter('type',value)} className={`shrink-0 min-h-11 rounded-xl px-4 text-sm border border-border ${venueType===value?'bg-primary text-white':'bg-card text-muted'}`}>{label}</button>)}</div>
        {/* PRETRAGA LOKALA */}
        <div className="mb-4 max-w-xl mx-auto md:mx-0 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); updateFilter('search',e.target.value); }}
            placeholder="Pretraži lokale (naziv, grad, adresa)..."
            aria-label="Pretraga lokala"
            className="w-full h-14 bg-surface border border-border rounded-2xl pl-12 pr-4 text-sm font-medium text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {loading ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <VenueCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 text-center text-sm font-bold text-white">Lokale trenutno nije moguće učitati. <button className="min-h-11 text-primary" onClick={()=>window.location.reload()}>Pokušaj ponovo</button></div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-20 text-muted text-sm font-black uppercase tracking-widest">
            Nema lokala za pretragu &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
