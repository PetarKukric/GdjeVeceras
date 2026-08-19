'use client';

import React, { useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { VenueCard } from '@/components/venues/VenueCard';
import { Event, Venue } from '@/types';
import { Heart, Calendar, MapPin} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<{ events: Event[], venues: Venue[] }>({ events: [], venues: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveCategory] = useState<'events' | 'venues'>('events');

  const fetchFavorites = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        setLoading(false);
        return;
      }
      const session = await sessionRes.json();
      
      const res = await fetch(`/api/favorites?userId=${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites({ events: data.events, venues: data.venues });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleEventFavoriteToggle = (eventId: string, favorited: boolean) => {
    if (!favorited) {
      setFavorites(prev => ({
        ...prev,
        events: prev.events.filter(e => e.id !== eventId)
      }));
    }
  };

  const handleVenueFavoriteToggle = (venueId: string, favorited: boolean) => {
    if (!favorited) {
      setFavorites(prev => ({
        ...prev,
        venues: prev.venues.filter(v => v.id !== venueId)
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow max-w-7xl mx-auto px-4 py-16 w-full pb-32 animate-fade-up">
        <header className="mb-16 text-center md:text-left">
          <div className="bg-primary/10 border border-primary/20 w-fit px-4 py-1.5 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-6 mx-auto md:mx-0">
             Your Collection
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase flex items-center justify-center md:justify-start gap-4 leading-tight">
            <Heart size={44} className="text-primary fill-primary" /> Sačuvano
          </h1>
          <p className="text-muted font-bold mt-4 uppercase tracking-[0.2em] text-[10px] opacity-70">Vaša personalizovana lista omiljenih događaja i lokala</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-8 mb-16 border-b border-border/50">
          <button 
            onClick={() => setActiveCategory('events')}
            className={`pb-5 px-1 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'events' ? 'text-primary' : 'text-muted hover:text-white'}`}
          >
            Događaji ({favorites.events.length})
            {activeTab === 'events' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-lg shadow-primary/50" />}
          </button>
          <button 
            onClick={() => setActiveCategory('venues')}
            className={`pb-5 px-1 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'venues' ? 'text-primary' : 'text-muted hover:text-white'}`}
          >
            Lokali ({favorites.venues.length})
            {activeTab === 'venues' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-lg shadow-primary/50" />}
          </button>
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-surface border border-border/50 rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'events' ? (
          favorites.events.length === 0 ? (
            <EmptyState 
              icon={Calendar} 
              title="Nemaš sačuvanih događaja" 
              description="Istraži predstojeće žurke i svirke i sačuvaj one koje ne želiš propustiti."
              actionHref="/events"
              actionLabel="ISTRAŽI DOGAĐAJE"
            />
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {favorites.events.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  isFavoritedInitial={true} 
                  onFavoriteToggle={handleEventFavoriteToggle}
                />
              ))}
            </div>
          )
        ) : (
          favorites.venues.length === 0 ? (
            <EmptyState 
              icon={MapPin} 
              title="Nemaš sačuvanih lokala" 
              description="Pronađi omiljene kafiće i klubove u gradu i prati njihova dešavanja."
              actionHref="/venues"
              actionLabel="POGLEDAJ LOKALE"
            />
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {favorites.venues.map((venue) => (
                <VenueCard 
                  key={venue.id} 
                  venue={venue} 
                  isFavoritedInitial={true} 
                  onFavoriteToggle={handleVenueFavoriteToggle}
                />
              ))}
            </div>
          )
        )}
      </main>
      <BottomNav />
    </div>
  );
}

// Uklonjena stara EmptyState funkcija
