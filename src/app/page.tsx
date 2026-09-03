'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Navigation, Trophy, Flame, Sparkles, Search as SearchIcon, Music, ArrowRight } from 'lucide-react';
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

export default function Home() {
  const router = useRouter();
  const [activeCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedCity, setSelectedCity] = useState('');
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
  } = useEvents({
    date: 'today',
    category: activeCategory,
    city: selectedCity
  });

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

  const cityForUrl = selectedCity ? `?city=${selectedCity}` : '';

  const handleHeroSearch = (params: { search?: string; date?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (selectedCity) qs.set('city', selectedCity);
    if (params.date) qs.set('date', params.date);
    if (params.category) qs.set('category', params.category);
    router.push(`/events?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col overflow-x-hidden">

      <main className="flex-grow">

        {/* ============ HERO (po referenci: slika desno, crni gradient s lijeva) ============ */}
        <section className="relative min-h-[560px] md:min-h-[640px] flex items-center overflow-hidden">
          {/* Pozadinska slika — desna strana, tretirana gradientima (bez vidljive ivice) */}
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src="/hero-concert.jpg"
              alt="Koncertna atmosfera — publika pod svjetlima bine"
              className="absolute right-0 top-0 h-full w-full md:w-[62%] object-cover object-center"
            />
            {/* Lijevo→desno: skoro crno → slika vidljiva (desktop) */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 md:via-background/60 to-background/20 md:to-transparent" />
            {/* Mobilni: slika zamrljana tamnim slojem za čitljivost */}
            <div className="absolute inset-0 bg-background/60 md:bg-transparent" />
            {/* Dno: transparentno → pozadina stranice */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 md:px-8 py-16 md:py-24">
            <div className="max-w-xl">
              <h1 className="text-hero font-black uppercase tracking-tight leading-[1.02] text-white mb-6">
                PRONAĐI.<br />
                <span className="text-primary">IZABERI.</span><br />
                IZAĐI.
              </h1>
              <p className="text-muted text-base md:text-lg font-medium leading-relaxed mb-8 max-w-md">
                Najbolje žurke i događaji u{' '}
                <span className="text-white font-bold">
                  {getCityBySlug(selectedCity) ? getCityBySlug(selectedCity)!.locative : 'tvom gradu'}.
                </span>
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/events${cityForUrl}`}
                  className="h-14 px-8 inline-flex items-center justify-center gap-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/25 uppercase tracking-[0.2em] text-[10px]"
                >
                  Istraži događaje <ArrowRight size={16} />
                </Link>
                <button
                  onClick={() => document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth' })}
                  className="h-14 px-8 inline-flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-colors uppercase tracking-[0.2em] text-[10px]"
                >
                  Pogledaj mapu <Navigation size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SEARCH BAR (naleže na hero odozdo) ============ */}
        <section className="relative z-20 max-w-6xl mx-auto px-4 md:px-8 -mt-10 md:-mt-14" aria-label="Pretraga">
          <HeroSearch
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onSearch={handleHeroSearch}
            cities={SUPPORTED_CITIES}
          />
        </section>

        {/* ============ KATEGORIJE ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
          <SectionHeader title="KATEGORIJE" subtitle="Pronađi provod po svom ukusu." />
          <CategoryCards />
        </section>

        {/* ============ ZA TEBE ============ */}
        {visibleRecommendations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
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
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
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

        {/* ============ POPULARNO ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
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

        {/* ============ LOKALI U TVOM GRADU + MAPA ============ */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
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
                  href={`/events${cityForUrl}`}
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
        {tonightData && tonightData.events.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
            <SectionHeader
              icon={Flame}
              title="UPRAVO SE DEŠAVA"
              subtitle="Događaji koji se dešavaju večeras."
            />
            <div className="flex gap-5 overflow-x-auto scrollbar-hide snap-x pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {tonightData.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
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
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
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
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24">
          <Newsletter />
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
