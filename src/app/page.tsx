'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Music, ArrowRight, Calendar, Navigation, Zap, Trophy, Star } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const Instagram = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const Facebook = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const TikTok = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);
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
  loading: () => <div className="w-full h-[350px] sm:h-[450px] lg:h-[600px] bg-card/20 border border-border/50 rounded-[3rem] animate-pulse flex items-center justify-center text-muted uppercase text-[10px] font-black tracking-widest">Učitavanje mape...</div>
});

export default function Home() {
  const router = useRouter();
  const [activeCategory] = useState<Category | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState(''); // '' = svi gradovi
  const [favoriteIds, setFavoriteIds] = useState<{events: string[], venues: string[]}>({events: [], venues: []});
  const [activeWeekendTab, setActiveWeekendTab] = useState<'PET' | 'SUB' | 'NED'>('PET');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [, setLocationError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [, setLoadingRecommendations] = useState(false);

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

          // Fetch recommendations
          setLoadingRecommendations(true);
          const recRes = await fetch('/api/events/recommendations?limit=4');
          if (recRes.ok) {
            const data = await recRes.json();
            // Samo događaji koji još nisu prošli
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
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
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
    loading: tonightLoading
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

  // Preporuke filtrirane po izabranom gradu
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

  const promotedVenues = React.useMemo(() => {
    if (!venuesData) return [];
    return venuesData.filter(v => v.promoted).slice(0, 5);
  }, [venuesData]);

  const {
    data: weekendData,
    loading: weekendLoading
  } = useEvents({ date: 'weekend', city: selectedCity });

  const {
    data: promotedEventsData
  } = useEvents({
    date: 'upcoming',
    limit: 4,
    sort: 'relevance',
    city: selectedCity
  });

  const promotedEvents = React.useMemo(() => {
    if (!promotedEventsData) return [];
    return promotedEventsData.events.filter(e => e.promoted);
  }, [promotedEventsData]);

  // Mapa: svi nadolazeći događaji izabranog grada (ne samo večerašnji)
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
    const dayMap = { 'PET': 5, 'SUB': 6, 'NED': 0 };
    const targetDay = dayMap[activeWeekendTab];
    return weekendData.events.filter(event => {
      const date = new Date(event.startDateTime);
      return date.getDay() === targetDay;
    });
  }, [weekendData, activeWeekendTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCity) params.set('city', selectedCity);
    const qs = params.toString();
    router.push(qs ? `/events?${qs}` : '/events');
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col overflow-x-hidden">
      <main className="flex-grow">
        
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-32 px-4 sm:pt-20 overflow-hidden min-h-[700px] flex items-center">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,128,0.1)_0%,transparent_70%)] z-1" />
            <img 
              src="/hero-new-bg.jpg" 
              alt="" 
              className="w-full h-full object-cover opacity-[0.25] blur-[2px] animate-pulse duration-[5000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
          </div>

          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10 w-full">
            <div className="lg:w-3/5 text-center lg:text-left animate-fade-up">
              <h1 className="text-4xl sm:text-6xl lg:text-9xl font-black text-white mb-4 sm:mb-6 tracking-tighter leading-none uppercase">
                PRONAĐI. IZABERI. <span className="text-primary italic animate-pulse">IZAĐI.</span>
              </h1>
              <p className="text-muted text-sm sm:text-2xl font-medium mb-8 sm:mb-12 max-w-xl mx-auto lg:mx-0 leading-relaxed opacity-80 uppercase tracking-widest">
                NAJBOLJA MJESTA ZA PROVOD U <span className="text-white">GRADU.</span>
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
                <button 
                  onClick={() => router.push('/events')}
                  className="w-full sm:w-auto px-10 py-5 bg-primary text-white font-black rounded-[1.25rem] hover:bg-primary-hover hover:scale-105 transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                >
                  PRONAĐI IZLAZAK <ArrowRight size={18} />
                </button>
                <button 
                   onClick={() => router.push('/how-it-works')}
                   className="w-full sm:w-auto px-10 py-5 bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black rounded-[1.25rem] hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                >
                  KAKO FUNKCIONIŠE? <div className="w-8 h-8 rounded-full bg-white text-background flex items-center justify-center ml-1 shadow-xl"><div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-current border-b-[5px] border-b-transparent translate-x-0.5" /></div>
                </button>
              </div>
            </div>

            <div className="lg:w-2/5 relative w-full max-w-lg animate-fade-up [animation-delay:200ms]">
               <div className="bg-card/60 backdrop-blur-3xl border border-white/10 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl relative z-20 hover:border-primary/30 transition-all duration-500 group/form overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2" />
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-3 text-white">
                    <Search size={18} className="text-primary group-hover/form:scale-110 transition-transform" /> PRETRAGA DOGAĐAJA
                  </h3>
                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="relative group">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Pretraži događaje..." 
                        className="w-full h-16 pl-14 bg-background/50 border border-white/5 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all text-white placeholder:text-muted/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors pointer-events-none" />
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full h-16 pl-14 pr-4 bg-background/50 border border-white/5 rounded-2xl text-sm font-medium focus:outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-background text-white">Svi gradovi</option>
                        {SUPPORTED_CITIES.map(city => (
                          <option key={city.slug} value={city.slug} className="bg-background text-white">{city.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                    <button type="submit" className="w-full h-16 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.3em] text-[10px] mt-4">
                      PRETRAŽI
                    </button>
                  </form>
               </div>
            </div>
          </div>
        </section>

        {/* ISTAKNUTI LOKALI (Promoted Venues) - ON TOP */}
        {promotedVenues.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-16 animate-fade-up">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12 px-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                   <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Premium Preporuka</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary"><Star size={32} fill="currentColor" className="animate-spin-slow" /></span> ISTAKNUTI LOKALI
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60">Najbolje ocijenjeni klubovi i kafići u gradu.</p>
              </div>
              <button onClick={() => router.push('/venues')} className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Svi lokali <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 px-4">
               {promotedVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} isFavoritedInitial={favoriteIds.venues.includes(venue.id)} />
               ))}
            </div>
          </section>
        )}

        {/* PROMOTED EVENTS SECTION */}
        {promotedEvents.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-14 sm:py-16 lg:py-20 animate-fade-up">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12 px-4">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary"><Zap size={32} fill="currentColor" className="animate-bounce" /></span> ISTAKNUTI DOGAĐAJI
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60 mt-4">Preporučeni događaji za vas.</p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
               {promotedEvents.map((event) => (
                 <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
               ))}
            </div>
          </section>
        )}

        {/* PERSONALIZED RECOMMENDATIONS SECTION */}
        {visibleRecommendations.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-14 sm:py-16 lg:py-20 animate-fade-up">
            <div className="flex justify-between items-end mb-8 md:mb-12 px-4">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary italic">✨</span> ZA TEBE
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60 mt-3 sm:mt-4">Na osnovu tvojih interesovanja i sačuvanih događaja.</p>
              </div>
            </div>

            <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
               {visibleRecommendations.map((event) => (
                 <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
               ))}
            </div>
          </section>
        )}

        {/* TONIGHT SECTION */}
        <section className="relative max-w-7xl mx-auto px-4 py-14 sm:py-16 animate-fade-up overflow-hidden rounded-[3rem] my-8">
          <div className="absolute inset-0 -z-10">
            <img src="/bg-tonight.jpg" alt="" className="w-full h-full object-cover opacity-[0.35] blur-[3px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
          </div>

          <div className="relative z-10 px-4">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary animate-pulse">🔥</span> {getCityBySlug(selectedCity) ? `VEČERAS U ${getCityBySlug(selectedCity)!.name.toUpperCase()}` : 'VEČERAS U GRADU'}
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-80 mt-4">Najbolja mjesta za izlazak večeras.</p>
              </div>
              <button onClick={() => router.push('/events')} className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Pogledaj sve <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
              {tonightLoading ? [1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />) : 
               (tonightData?.events.length ? tonightData.events.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
              )) : (
                <div className="md:col-span-2 lg:col-span-4 bg-card/60 border border-white/10 rounded-[2rem] p-10 sm:p-14 text-center space-y-4">
                  <p className="text-white font-black uppercase tracking-tight text-base sm:text-lg">Trenutno nema događaja u ovom gradu.</p>
                  {selectedCity && (
                    <button onClick={() => setSelectedCity('')} className="px-6 py-3 bg-white/5 border border-white/10 text-muted hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Pogledaj drugi grad
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* POPULAR EVENTS SECTION */}
        {popularEvents.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-14 sm:py-16 lg:py-20 animate-fade-up">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12 px-4">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-accent italic">✨</span> POPULARNI DOGAĐAJI
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60 mt-4">Događaji koje ljudi najviše čuvaju.</p>
              </div>
              <button onClick={() => router.push('/events?sort=popularity')} className="text-accent text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Pogledaj sve <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
               {popularLoading ? [1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />) : 
                popularEvents.map((event) => (
                  <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
                ))
               }
            </div>
          </section>
        )}

        {/* POPULAR VENUES SECTION */}
        {popularVenues.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 py-14 sm:py-16 lg:py-20 animate-fade-up">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12 px-4">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary"><Trophy size={32} className="text-yellow-500" /></span> POPULARNI LOKALI
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60 mt-4">Najviše sačuvani klubovi i kafići.</p>
              </div>
              <button onClick={() => router.push('/venues')} className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Svi lokali <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 px-4">
               {popularVenuesLoading ? [1, 2, 3, 4, 5].map(i => <div key={i} className="h-64 bg-card border border-border animate-pulse rounded-3xl" />) : 
                popularVenues.map((venue) => (
                  <VenueCard key={venue.id} venue={venue} isFavoritedInitial={favoriteIds.venues.includes(venue.id)} />
                ))
               }
            </div>
          </section>
        )}

        {/* MAP SECTION */}
        <section className="max-w-7xl mx-auto px-4 py-14 md:py-16 lg:py-24 animate-fade-up">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 mb-6 md:mb-12 px-0 md:px-4">
              <div className="text-center md:text-left">
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-3 sm:mb-4">
                   MAPA <span className="text-primary">DOGAĐAJA</span> 🗺️
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60">Istraži svoj grad i pronađi provod u blizini.</p>
              </div>
              {!userLocation ? (
                <button 
                  onClick={handleLocationRequest}
                  disabled={isLocating}
                  className="px-8 py-4 bg-primary/10 border border-primary/20 text-primary font-black rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center gap-3 uppercase tracking-widest text-[10px] shadow-xl disabled:opacity-50"
                >
                   {isLocating ? (
                     <>LOCIRANJE...</>
                   ) : (
                     <><Navigation size={16} /> Pronađi događaje u blizini</>
                   )}
                </button>
              ) : (
                <div className="px-6 py-3 bg-green-500/10 border border-green-500/20 text-green-500 font-black rounded-2xl flex items-center gap-2 uppercase tracking-widest text-[9px]">
                   <MapPin size={14} /> LOKACIJA OMOGUĆENA
                </div>
              )}
           </div>

           <div className="h-[350px] sm:h-[450px] lg:h-[600px] w-full px-0 md:px-4">
              <ClientOnly fallback={<div className="w-full h-full bg-card/20 border border-border/50 rounded-[3rem] animate-pulse" />}>
                 <EventMap 
                   events={mapEventsData?.events || []} 
                   userLocation={userLocation}
                   center={getCityBySlug(selectedCity) ? [getCityBySlug(selectedCity)!.lat, getCityBySlug(selectedCity)!.lng] : undefined}
                   centerKey={selectedCity || 'all'}
                   zoom={getCityBySlug(selectedCity)?.zoom || 8}
                 />
              </ClientOnly>
           </div>
        </section>

        {/* UPRAVO SE DEŠAVA SECTION */}
        <section className="max-w-7xl mx-auto px-4 py-14 sm:py-16 lg:py-20 animate-fade-up">
           <div className="flex items-center gap-4 mb-8 px-4 text-left">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(255,0,128,0.8)]" />
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">UPRAVO SE DEŠAVA</h2>
           </div>
           
           <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide px-4">
              {tonightData?.events.map((event) => (
                <Link 
                  key={event.id} 
                  href={`/events/${event.slug}`}
                  className="min-w-[320px] bg-surface/50 border border-border/50 rounded-3xl p-5 flex items-center gap-5 hover:border-primary/30 hover:scale-[1.02] transition-all cursor-pointer group shadow-xl"
                >
                   <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <img src={event.imageUrl || '/hero-bg.jpg'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   </div>
                   <div className="flex-grow text-left">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h4>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1 mb-3">{event.venue.name}</p>
                      <div className="flex items-center justify-between">
                         <span className="flex items-center gap-1.5 text-[8px] font-black text-primary uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" /> LIVE
                         </span>
                         <span className="text-[10px] font-bold text-muted">{new Date(event.startDateTime).toLocaleTimeString('bs', {hour: '2-digit', minute: '2-digit'})}</span>
                      </div>
                   </div>
                </Link>
              ))}
           </div>
        </section>

        {/* LOKALI SECTION */}
        <section className="relative max-w-7xl mx-auto px-4 py-16 animate-fade-up overflow-hidden rounded-[3rem] my-4">
          <div className="absolute inset-0 -z-10">
            <img src="/bg-venues.jpg" alt="" className="w-full h-full object-cover opacity-[0.35] blur-[2px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
          </div>

          <div className="relative z-10 px-4">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary"><MapPin size={32} /></span> SVI LOKALI
                </h2>
                <p className="text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-80 mt-4">Istražite mjesta u svom gradu.</p>
              </div>
              <button onClick={() => router.push('/venues')} className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Pogledaj sve <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 px-4">
                {!venuesLoading && venuesData.slice(0, 5).map((venue) => (
                  <VenueCard key={venue.id} venue={venue} isFavoritedInitial={favoriteIds.venues.includes(venue.id)} />
                ))
              }
            </div>
          </div>
        </section>

        {/* OVAJ VIKEND SECTION */}
        <section className="relative py-24 px-4 overflow-hidden animate-fade-up bg-surface/30">
          <div className="absolute inset-0 -z-10">
            <img src="/bg-weekend.jpg" alt="" className="w-full h-full object-cover opacity-[0.35] blur-[3px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
          </div>

          <div className="max-w-7xl mx-auto relative z-10 px-4">
            <div className="flex justify-between items-end gap-4 mb-8 md:mb-12">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none flex items-center gap-4">
                   <span className="text-primary"><Calendar size={32} /></span> OVAJ VIKEND
                </h2>
              </div>
              <button onClick={() => router.push('/events?date=weekend')} className="text-primary text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2 group">
                Pogledaj sve <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex gap-10 mb-10 border-b border-border/50 overflow-x-auto scrollbar-hide px-4">
             <button 
               onClick={() => setActiveWeekendTab('PET')}
               className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeWeekendTab === 'PET' ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'}`}
             >
               PETAK
             </button>
             <button 
               onClick={() => setActiveWeekendTab('SUB')}
               className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeWeekendTab === 'SUB' ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'}`}
             >
               SUBOTA
             </button>
             <button 
               onClick={() => setActiveWeekendTab('NED')}
               className={`pb-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeWeekendTab === 'NED' ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'}`}
             >
               NEDJELJA
             </button>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 px-4">
              {weekendLoading ? [1, 2, 3, 4].map(i => <EventCardSkeleton key={i} />) : 
               filteredWeekendEvents.length === 0 ? (
                 <div className="col-span-full py-12 text-center text-muted font-bold uppercase tracking-widest text-xs">Nema događaja za ovaj dan</div>
               ) : (
                filteredWeekendEvents.map((event) => (
                  <EventCard key={event.id} event={event} isFavoritedInitial={favoriteIds.events.includes(event.id)} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* KAKO FUNKCIONIŠE SECTION */}
        <section className="max-w-7xl mx-auto px-4 py-16 animate-fade-up">
           <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-12 px-4 text-left">KAKO FUNKCIONIŠE?</h2>
           <div className="grid gap-8 md:grid-cols-3 px-4">
              {[
                { n: '1', icon: Search, title: 'PRONAĐI', desc: 'Pronađi događaje u svom gradu.' },
                { n: '2', icon: Calendar, title: 'IZABERI', desc: 'Pogledaj detalje i izaberi gdje ideš.' },
                { n: '3', icon: Music, title: 'IZAĐI', desc: 'Sačuvaj događaj i uživaj.' },
              ].map((step, i) => (
                <div key={i} className="bg-surface/50 border border-border/50 p-10 rounded-[2.5rem] flex items-center gap-8 group hover:border-primary/30 hover:scale-[1.02] transition-all shadow-2xl">
                   <div className="relative">
                      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-black z-10">{step.n}</div>
                      <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                         <step.icon size={28} />
                      </div>
                   </div>
                   <div className="text-left">
                      <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{step.title}</h4>
                      <p className="text-[10px] font-medium text-muted leading-relaxed uppercase tracking-wide">{step.desc}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </main>

      <BottomNav />
      
      {/* FOOTER */}
      <footer className="border-t border-border/50 pt-20 pb-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto grid gap-16 md:grid-cols-4">
          <div className="space-y-8">
            <img src="/logo-final.png" alt="Gdje Večeras" className="h-16 w-auto object-contain" />
            <p className="text-muted text-[10px] font-bold tracking-widest leading-loose opacity-60">© 2026 Gdje Večeras. Sva prava zadržana.</p>
          </div>
          
          <div className="space-y-8">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">LINKOVI</h4>
             <nav className="flex flex-col gap-4 text-left">
                <Link href="/" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Početna</Link>
                <Link href="/events" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Događaji</Link>
                <Link href="/venues" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Lokali</Link>
                <Link href="/contact" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Kontakt</Link>
             </nav>
          </div>

          <div className="space-y-8">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">KORISNO</h4>
             <nav className="flex flex-col gap-4 text-left">
                <Link href="/about" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">O nama</Link>
                <Link href="/how-it-works" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Kako funkcioniše?</Link>
                <Link href="/terms" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Uslovi korištenja</Link>
                <Link href="/privacy" className="text-[10px] font-bold text-muted hover:text-primary uppercase tracking-widest transition-colors">Privatnost</Link>
             </nav>
          </div>

          <div className="space-y-8">
             <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">PRATITE NAS</h4>
             <div className="flex gap-4">
                <a href="https://www.instagram.com/gdjeveceras" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-muted hover:text-primary transition-all cursor-pointer" aria-label="Instagram"><Instagram size={18} /></a>
                <a href="https://www.facebook.com/share/1EaMwFTjic/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-muted hover:text-primary transition-all cursor-pointer" aria-label="Facebook"><Facebook size={18} /></a>
                <a href="https://www.tiktok.com/@gdjeveceras2" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-surface border border-border/50 flex items-center justify-center text-muted hover:text-primary transition-all cursor-pointer" aria-label="TikTok"><TikTok size={18} /></a>
             </div>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
