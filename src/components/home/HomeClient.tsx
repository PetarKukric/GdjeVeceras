'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Trophy, Flame, Sparkles, Search as SearchIcon, Music } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HeroSearch } from '@/components/home/HeroSearch';
import { CategoryCards } from '@/components/home/CategoryCards';
import { OwnerCta } from '@/components/home/OwnerCta';
import { Newsletter } from '@/components/home/Newsletter';
import { EventCard } from '@/components/events/EventCard';
import { VenueCard } from '@/components/venues/VenueCard';
import { EventCardSkeleton } from '@/components/ui/Skeleton';
import { useEvents } from '@/hooks/useEvents';
import { useVenues } from '@/hooks/useVenues';
import { Category } from '@/types';
import { useRouter } from 'next/navigation';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { POPULARITY_THRESHOLD } from '@/lib/constants';
import { SUPPORTED_CITIES, getCityBySlug } from '@/lib/cities';
import { readSavedCity, saveCity } from '@/lib/city-preference';
import type { Event, EventsResponse } from '@/types';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const EventMap = dynamic(() => import('@/components/map/EventMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-card border border-border rounded-3xl animate-pulse flex items-center justify-center text-muted uppercase text-[10px] font-black tracking-widest">Učitavanje mape...</div>
});

const SARAJEVO_WEEKDAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Sarajevo',
  weekday: 'short',
});

const weekendTabForDate = (date: Date): 'PET' | 'SUB' | 'NED' => {
  const weekday = SARAJEVO_WEEKDAY.format(date);
  return weekday === 'Sat' ? 'SUB' : weekday === 'Sun' ? 'NED' : 'PET';
};

interface HomeClientProps {
  initialCity: string;
  explicitCity?: boolean;
  initialDate: string;
  initialEvents: unknown[];
}

export function HomeClient({ initialCity, initialDate, initialEvents, explicitCity = false }: HomeClientProps) {
  const router = useRouter();
  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => { setClock(Date.now()); const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [activeCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [favoriteIds, setFavoriteIds] = useState<{events: string[], venues: string[]}>({events: [], venues: []});
  const [activeWeekendTab, setActiveWeekendTab] = useState<'PET' | 'SUB' | 'NED'>('PET');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [, setLocationError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    setActiveWeekendTab(weekendTabForDate(new Date()));
  }, []);

  useEffect(() => {
    if (explicitCity) {
      setSelectedCity(initialCity);
      saveCity(initialCity);
    } else {
      const saved = readSavedCity();
      if (saved && SUPPORTED_CITIES.some((city) => city.slug === saved)) {
        setSelectedCity(saved);
        const params = new URLSearchParams(window.location.search);
        params.set('city', saved);
        router.replace(`/?${params.toString()}`, { scroll: false });
      }
    }
    setSelectedDate(initialDate);
  }, [initialCity, initialDate, explicitCity, router]);

  useEffect(() => {
    async function fetchFavorites() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const favRes = await fetch(`/api/favorites?userId=${session.user.id}`);
          if (favRes.ok) {
            const data = await favRes.json();
            setFavoriteIds({
              events: data.eventIds || [],
              venues: data.venueIds || []
            });
          }

          setLoadingRecommendations(true);
          const recRes = await fetch('/api/events/recommendations?limit=4');
          if (recRes.ok) {
            const data = await recRes.json();
            const upcoming = (data.events || []).filter((e: any) => !e.endDateTime || new Date(e.endDateTime) >= new Date());
            setRecommendations(upcoming);
          }
          setLoadingRecommendations(false);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
        setLoadingRecommendations(false);
      }
    }
    fetchFavorites();
  }, []);

  const handleLocationRequest = () => {
    setIsLocating(true);
    setLocationError(false);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error("Location error", error);
          setLocationError(true);
          setIsLocating(false);
        }
      );
    } else {
      setLocationError(true);
      setIsLocating(false);
    }
  };

  const {
    data: tonightData,
    loading: discoveryLoading,
    error: discoveryError,
  } = useEvents({
    date: selectedDate,
    category: activeCategory,
    city: selectedCity,
    limit: 12,
    initialData: {
      events: initialEvents as Event[],
      pagination: { total: initialEvents.length, page: 1, limit: 12, totalPages: 1 },
    } as EventsResponse,
  });

  const { data: nextEventsData } = useEvents({ date: 'upcoming', city: selectedCity, limit: 4 });

  const {
    data: popularData,
    loading: popularLoading
  } = useEvents({
    date: 'upcoming',
    sort: 'popularity',
    limit: 8,
    city: selectedCity
  });

  const {
    data: popularVenuesData,
    loading: popularVenuesLoading
  } = useVenues({
    sort: 'popularity',
    limit: 8,
    city: selectedCity
  });

  const {
    data: venuesData,
    loading: venuesLoading
  } = useVenues({ city: selectedCity });

  const popularEvents = React.useMemo(() => {
    if (!popularData) return [];
    return popularData.events.filter(e => (e._count?.favorites || 0) >= POPULARITY_THRESHOLD).slice(0, 4);
  }, [popularData]);

  const visibleRecommendations = React.useMemo(() => {
    const city = getCityBySlug(selectedCity);
    if (!city) return recommendations;
    return recommendations.filter(e => {
      const venueCity = (e.venue && e.venue.city) || '';
      return venueCity.trim().toLowerCase() === city.name.toLowerCase();
    });
  }, [recommendations, selectedCity]);

  const popularVenues = React.useMemo(() => {
    if (!popularVenuesData) return [];
    return popularVenuesData.filter(v => (v._count?.favorites || 0) >= POPULARITY_THRESHOLD).slice(0, 5);
  }, [popularVenuesData]);

  const {
    data: weekendData,
    loading: weekendLoading
  } = useEvents({ date: 'weekend', city: selectedCity, limit: 100 });

  const {
    data: mapEventsData
  } = useEvents({
    date: 'upcoming',
    limit: 60,
    sort: 'startTime',
    city: selectedCity
  });

  const filteredWeekendEvents = React.useMemo(() => {
    if (!weekendData) return [];
    const dayMap = { PET: 'Fri', SUB: 'Sat', NED: 'Sun' } as const;
    const targetDay = dayMap[activeWeekendTab];
    return weekendData.events.filter(event => {
      const date = new Date(event.startDateTime);
      return SARAJEVO_WEEKDAY.format(date) === targetDay;
    });
  }, [weekendData, activeWeekendTab]);

  const liveEvents = clock === null ? [] : (tonightData?.events || []).filter(event => new Date(event.startDateTime).getTime() <= clock && Boolean(event.endDateTime) && new Date(event.endDateTime).getTime() > clock);
  const updateDiscoveryUrl = (city: string, date: string) => {
    const params = new URLSearchParams();
    params.set('city', city);
    if (date && date !== 'today') params.set('date', date);
    const query = params.toString();
    router.replace(query ? `/?${query}` : '/', { scroll: false });
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    saveCity(city);
    updateDiscoveryUrl(city, selectedDate);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    updateDiscoveryUrl(selectedCity, date);
  };

  const handleHeroSearch = (params: { search?: string; date?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (selectedCity) qs.set('city', selectedCity);
    if (params.date) qs.set('date', params.date);
    if (params.category) qs.set('category', params.category);
    router.push(`/events?${qs.toString()}`);
  };

  return (
    <div className="discovery-page min-h-screen bg-background text-text flex flex-col">

      <main className="flex-grow">

        <section className="home-intro max-w-7xl mx-auto px-4 md:px-8">
          <div className="city-picker"><MapPin size={18} /><select aria-label="Izaberi grad" value={selectedCity} onChange={e => handleCityChange(e.target.value)}><option value="">Svi gradovi</option>{SUPPORTED_CITIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <h1>Gdje izlaziš <span className="text-primary">večeras?</span></h1>
          <p>Pronađi. Izaberi. Izađi.</p>
          <HeroSearch selectedCity={selectedCity} selectedDate={selectedDate} onCityChange={handleCityChange} onDateChange={handleDateChange} onSearch={handleHeroSearch} cities={SUPPORTED_CITIES} />
        </section>

        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-8" aria-live="polite">
          <SectionHeader
            icon={Calendar}
            title={selectedDate === 'tomorrow' ? 'Sutra' : selectedDate === 'weekend' ? 'Ovaj vikend' : 'Večeras'}
            subtitle={getCityBySlug(selectedCity) ? `Događaji u ${getCityBySlug(selectedCity)!.locative}` : 'Događaji u svim podržanim gradovima'}
            actionLabel="Svi događaji"
            actionHref={`/events?date=${selectedDate}${selectedCity ? `&city=${selectedCity}` : ''}`}
          />
          {discoveryLoading ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((item) => <EventCardSkeleton key={item} />)}
            </div>
          ) : discoveryError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
              <p className="text-sm font-bold text-white">Događaje trenutno nije moguće učitati.</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-[10px] font-black uppercase tracking-widest text-primary">Pokušaj ponovo</button>
            </div>
          ) : tonightData?.events.length ? (
            <div className="discovery-results">
              {tonightData.events.map((event, index) => (
                <EventCard key={`${event.id}-${event.occurrenceDate || ''}`} event={event} variant={index === 0 ? 'featured' : 'compact'} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-7 md:p-10 text-center">
              <h3 className="text-xl font-black text-white">Nema događaja za izabrani filter.</h3>
              <p className="mt-2 text-sm text-muted">Ne prikazujemo drugi grad bez tvog izbora. Promijeni datum ili pogledaj naredne događaje u istom gradu.</p>
              {(nextEventsData?.events.length || 0) > 0 && (
                <div className="mt-7 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-left">
                  {nextEventsData!.events.map((event) => <EventCard key={event.id} event={event} />)}
                </div>
              )}
              <Link href={`/events?date=upcoming${selectedCity ? `&city=${selectedCity}` : ''}`} className="mt-6 inline-flex text-[10px] font-black uppercase tracking-widest text-primary">
                Pogledaj sve naredne događaje →
              </Link>
            </div>
          )}

        </section>

        {/* ============ KATEGORIJE ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <SectionHeader title="KATEGORIJE" subtitle="Pronađi provod po svom ukusu." />
          <CategoryCards selectedCity={selectedCity} />
        </section>

        {/* ============ ZA TEBE ============ */}
        {visibleRecommendations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
            <SectionHeader
              icon={Sparkles}
              title="ZA TEBE"
              subtitle="Na osnovu događaja i lokala koje pratiš"
              actionLabel="Svi događaji"
              actionHref="/events"
            />
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {visibleRecommendations.map((event) => (
                <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ============ OVAJ VIKEND ============ */}
        {(weekendLoading || Boolean(weekendData?.events.length)) && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <SectionHeader
            icon={Calendar}
            title="OVAJ VIKEND"
            actionLabel="Pogledaj sve"
            onAction={() => router.push(`/events?date=weekend${selectedCity ? `&city=${selectedCity}` : ''}`)}
          />
          <div className="flex gap-8 mb-8 border-b border-border overflow-x-auto scrollbar-hide" role="tablist" aria-label="Dani vikenda">
            {([['PET', 'PETAK'], ['SUB', 'SUBOTA'], ['NED', 'NEDJELJA']] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeWeekendTab === key}
                onClick={() => setActiveWeekendTab(key)}
                className={`pb-4 text-[10px] font-black uppercase tracking-[0.25em] transition-all border-b-2 ${activeWeekendTab === key ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {weekendLoading ? [1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />) :
              filteredWeekendEvents.length === 0 ? (
                <div className="col-span-full py-12 text-center">
                  <p className="text-muted font-medium text-sm mb-4">
                    Nema događaja {selectedCity && getCityBySlug(selectedCity) ? `u ${getCityBySlug(selectedCity)!.locative} ` : ''}za ovaj dan.
                  </p>
                  <Link href="/events" className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors">
                    Pogledaj sve događaje →
                  </Link>
                </div>
              ) : (
                filteredWeekendEvents.map((event) => (
                  <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
                ))
              )
            }
          </div>
        </section>
        )}

        {/* ============ POPULARNO ============ */}
        {(popularLoading || popularVenuesLoading || popularEvents.length > 0 || popularVenues.length > 0) && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <SectionHeader
            icon={Trophy}
            title="POPULARNO"
            subtitle="Događaji i lokali koje ljudi najviše čuvaju."
            actionLabel="Pogledaj sve"
            onAction={() => router.push(`/events?sort=popularity${selectedCity ? `&city=${selectedCity}` : ''}`)}
          />
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            {popularLoading ? [1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />) :
              popularEvents.map((event) => (
                <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
              ))
            }
          </div>
          {popularVenues.length > 0 && (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              {popularVenuesLoading ? [1, 2, 3, 4, 5].map(i => <div key={i} className="h-64 bg-card border border-border animate-pulse rounded-2xl" />) :
                popularVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} isFavoritedInitial={favoriteIds.venues.includes(venue.id)} />
                ))
              }
            </div>
          )}
        </section>
        )}

        {/* ============ LOKALI U TVOM GRADU + MAPA ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            {/* Lijevо: karusel lokala */}
            <div className="min-w-0">
              <SectionHeader
                icon={MapPin}
                title="LOKALI U TVOM GRADU"
                subtitle={selectedCity && getCityBySlug(selectedCity) ? getCityBySlug(selectedCity)!.name : 'Istraži mjesta za izlazak'}
                actionLabel="Svi lokali"
                actionHref="/venues"
              />
              <div className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                {venuesLoading
                  ? [1, 2, 3].map(i => <div key={i} className="min-w-[280px] h-64 bg-card border border-border animate-pulse rounded-2xl" />)
                  : venuesData.slice(0, 8).map((venue) => (
                      <div key={venue.id} className="min-w-[280px] sm:min-w-[300px] snap-start">
                        <VenueCard venue={venue} isFavoritedInitial={favoriteIds.venues.includes(venue.id)} />
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Desno: MAPA panel + OWNER CTA */}
            <div className="flex flex-col gap-6">
              <div id="mapa" className="bg-elevated border border-border rounded-3xl p-5 scroll-mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Mapa događaja</h3>
                  {!userLocation && (
                    <button
                      onClick={handleLocationRequest}
                      disabled={isLocating}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isLocating ? 'Lociranje…' : 'Blizina'}
                    </button>
                  )}
                </div>
                <div className="h-[260px] md:h-[300px] rounded-2xl overflow-hidden border border-border">
                  <ClientOnly fallback={<div className="w-full h-full bg-card animate-pulse" />}>
                    <EventMap
                      events={mapEventsData?.events || []}
                      userLocation={userLocation}
                      center={getCityBySlug(selectedCity) ? [getCityBySlug(selectedCity)!.lat, getCityBySlug(selectedCity)!.lng] : undefined}
                      centerKey={selectedCity || 'all'}
                      zoom={getCityBySlug(selectedCity)?.zoom || 8}
                    />
                  </ClientOnly>
                </div>
                <Link
                  href={`/events?view=map${selectedCity ? `&city=${selectedCity}` : ''}`}
                  className="mt-4 w-full h-12 inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary hover:border-primary transition-all"
                >
                  <MapPin size={14} /> Otvori mapu
                </Link>
              </div>

              <OwnerCta />
            </div>
          </div>
        </section>

        {/* ============ UPRAVO SE DEŠAVA (live feed — postojeća funkcionalnost) ============ */}
        {selectedDate === 'today' && liveEvents.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
            <SectionHeader
              icon={Flame}
              title="UPRAVO SE DEŠAVA"
              subtitle="Događaji koji trenutno traju."
            />
            <div className="flex gap-5 overflow-x-auto scrollbar-hide snap-x pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {liveEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}${event.occurrenceDate ? `?date=${event.occurrenceDate}` : ''}`}
                  className="min-w-[300px] snap-start bg-surface border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 transition-all group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-card">
                    <img src={event.imageUrl || '/hero-bg.jpg'} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0 text-left">
                    <h4 className="text-sm font-black text-white line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h4>
                    <p className="text-xs font-medium text-muted mt-0.5 mb-2 truncate">{event.venue.name}</p>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============ KAKO FUNKCIONIŠE (kompaktno) ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <SectionHeader title="KAKO FUNKCIONIŠE?" />
          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {[
              { icon: SearchIcon, title: 'PRONAĐI', desc: 'Pronađi događaje u svom gradu.' },
              { icon: Calendar, title: 'IZABERI', desc: 'Pogledaj detalje i izaberi gdje ideš.' },
              { icon: Music, title: 'IZAĐI', desc: 'Sačuvaj događaj i uživaj.' },
            ].map((step, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-5 hover:border-primary/30 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0" aria-hidden="true">
                  <step.icon size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{step.title}</h4>
                  <p className="text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============ NEWSLETTER ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
          <Newsletter />
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
