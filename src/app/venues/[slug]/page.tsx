'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import { 
  Globe, 
  Phone,
  MapPin,
  Loader2,
  Clock,
  Tag as TagIcon,
  Car,
  Wifi,
  Utensils,
  Tv,
  Star,
  Music,
  Disc,
  Snowflake,
  Sun,
  CalendarCheck,
  Target,
  Accessibility,
  Shirt,
  Beer,
  Share2,
  Heart,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const Instagram = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);

const Facebook = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

const TikTok = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);
import { BottomNav } from '@/components/layout/BottomNav';
import { EventCard } from '@/components/events/EventCard';
import { VenueLocation } from '@/components/venues/VenueLocation';
import { VenueGallery } from '@/components/venues/VenueGallery';
import { CommentSection } from '@/components/comments/CommentSection';
import { getVenueStatus } from '@/lib/venue-utils';
import Link from 'next/link';
import { ShareModal } from '@/components/share/ShareModal';
import { useToast } from '@/components/ui/Toast';

const TAG_ICONS: Record<string, any> = {
  'Parking': Car,
  'Wi-Fi': Wifi,
  'Hrana': Utensils,
  'TV': Tv,
  'Sportski prenosi': Tv,
  'VIP': Star,
  'Live muzika': Music,
  'Plesni podij': Disc,
  'Klima': Snowflake,
  'Terasa': Sun,
  'Bašta': Sun,
  'Rezervacije': CalendarCheck,
  'Bilijar': Target,
  'Pikado': Target,
  'Pristup za osobe sa invaliditetom': Accessibility,
  'Garderoba': Shirt,
  'Piće': Beer,
  'Kokteli': Beer,
};

export default function VenuePage() {
  const { slug } = useParams();
  const [venue, setVenue] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [venueStatus, setVenueStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('pregled');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const { showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [venueRes, sessionRes] = await Promise.all([
        fetch(`/api/venues/${slug}`),
        fetch('/api/auth/session')
      ]);

      if (venueRes.ok) {
        const venueData = await venueRes.json();
        setVenue(venueData);
        if (venueData.openingHours) {
           setVenueStatus(getVenueStatus(venueData.openingHours));
        }
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);
      }
    } catch {
      console.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) fetchData();
  }, [slug, fetchData]);

  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, venueId: venue.id })
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.favorited);
        showToast(data.favorited ? 'Lokal sačuvan' : 'Uklonjeno iz sačuvanih');
      }
    } catch {}
  };

  if (loading) return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (!venue) {
    notFound();
  }

  const upcomingEvents = venue.events || [];
  const isOwner = user && (user.id === venue.ownerId || user.role === 'ADMIN');

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow pb-28 md:pb-24 animate-fade-up">
        
        {/* BREADCRUMB */}
        <nav className="max-w-[1440px] mx-auto px-4 py-4 flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
           <Link href="/" className="hover:text-primary transition-colors">Početna</Link>
           <ChevronRight size={10} />
           <Link href="/venues" className="hover:text-primary transition-colors">Lokali</Link>
           <ChevronRight size={10} />
           <span className="text-white truncate max-w-[200px]">{venue.name}</span>
        </nav>

        <div className="max-w-[1440px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* HERO SECTION */}
            <section className="relative w-full aspect-[21/9] min-h-[300px] rounded-3xl overflow-hidden bg-card border border-white/5 shadow-2xl group">
              {venue.imageUrl ? (
                <img 
                  src={venue.imageUrl} 
                  alt={venue.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center text-border opacity-10" aria-hidden="true">
                  <MapPin size={72} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,110,0.1),transparent_50%)]" />
              
              {/* Top Right Actions */}
              <div className="absolute top-6 right-6 flex gap-3">
                 <button 
                   onClick={() => setIsShareModalOpen(true)}
                   className="w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:text-primary transition-all shadow-lg group/btn"
                 >
                    <Share2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                 </button>
                 <button 
                   onClick={toggleFavorite}
                   className={`w-10 h-10 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all shadow-lg group/btn ${isFavorited ? 'text-primary' : 'text-white hover:text-primary'}`}
                 >
                    <Heart size={18} fill={isFavorited ? "currentColor" : "none"} className="group-hover/btn:scale-110 transition-transform" />
                 </button>
              </div>

              {/* Badge */}
              <div className="absolute top-6 left-6">
                 <div className="bg-primary/90 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                   Istaknuti lokal
                 </div>
              </div>
              
              <div className="absolute bottom-8 left-8 flex items-end gap-6">
                <div className="w-24 h-24 rounded-3xl bg-card border-4 border-background shadow-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden">
                   {venue.imageUrl ? <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" /> : <MapPin size={36} className="opacity-20" aria-hidden="true" />}
                </div>
                <div className="flex-grow pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                      {venue.name}
                    </h1>
                    <div className="w-6 h-6 rounded-full bg-accent text-[10px] flex items-center justify-center text-white shrink-0">✓</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-muted font-bold text-[10px] uppercase tracking-widest">
                      <MapPin size={14} className="text-primary" /> {venue.address}, {venue.city}
                    </div>
                    {venueStatus && (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${venueStatus.status === 'OPEN' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${venueStatus.status === 'OPEN' ? 'text-green-500' : 'text-red-500'}`}>
                          {venueStatus.label}
                        </span>
                        {venueStatus.subLabel && <span className="text-[10px] font-bold text-muted uppercase tracking-widest opacity-60">— {venueStatus.subLabel}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* PROFILE NAVIGATION */}
            <div className="flex items-center gap-8 border-b border-white/5 overflow-x-auto scrollbar-hide py-2 px-4 sticky top-0 bg-background/80 backdrop-blur-xl z-50">
               {[
                 { id: 'pregled', label: 'Pregled' },
                 { id: 'dogadjaji', label: 'Događaji' },
                 { id: 'galerija', label: 'Galerija' },
                 { id: 'komentari', label: 'Komentari' },
                 { id: 'informacije', label: 'Informacije' },
               ].map((tab) => (
                 <button 
                   key={tab.id}
                   onClick={() => scrollToSection(tab.id)}
                   className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-muted hover:text-white'}`}
                 >
                   {tab.label} {tab.id === 'komentari' && `(${venue._count?.comments || 0})`}
                   {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(255,0,110,0.5)]" />}
                 </button>
               ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="space-y-12 py-4">
              
              {/* O LOKALU SECTION */}
              <section id="pregled" className="space-y-8 text-left bg-card/30 border border-white/5 p-10 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                     <div className="w-8 h-px bg-primary" /> O LOKALU
                  </h2>
                  {isOwner && (
                    <div className="flex gap-2">
                      <Link href={`/admin/venues/${venue.slug}`} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                        Uredi profil
                      </Link>
                    </div>
                  )}
                </div>
                <div className="space-y-8">
                  <p className="text-muted leading-relaxed font-medium text-lg">
                    {venue.description || 'Nema opisa za ovaj lokal.'}
                  </p>
                  
                  {venue.tags && venue.tags.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-white/5 pt-8">
                      {venue.tags.map((tag: any) => {
                        const Icon = TAG_ICONS[tag.name] || TagIcon;
                        return (
                          <div key={tag.id} className="flex items-center gap-4 group">
                             <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                                <Icon size={18} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{tag.name}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* GALERIJA SECTION */}
              <section id="galerija" className="space-y-8 bg-card/20 border border-white/5 p-10 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                     <div className="w-8 h-px bg-primary" /> GALERIJA
                  </h2>
                  {venue.images && venue.images.length > 8 && (
                    <button 
                      onClick={() => setShowAllGallery(!showAllGallery)}
                      className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                       {showAllGallery ? 'Prikaži manje' : 'Prikaži sve'} <ChevronRight size={14} className={`transition-transform ${showAllGallery ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                    </button>
                  )}
                </div>
                
                <VenueGallery 
                  venueId={venue.id} 
                  ownerId={venue.ownerId} 
                  images={venue.images || []} 
                  currentUser={user} 
                  onRefresh={fetchData}
                  hideHeader={true}
                  limit={showAllGallery ? undefined : 8}
                />
              </section>

              {/* DOGAĐAJI SECTION */}
              <section id="dogadjaji" className="space-y-8 bg-card/20 border border-white/5 p-10 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                     <div className="w-8 h-px bg-primary" /> NADOLAZEĆI DOGAĐAJI
                  </h2>
                  {upcomingEvents.length > 4 ? (
                    <button 
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group"
                    >
                       {showAllEvents ? 'Prikaži manje' : 'Prikaži sve'} <ChevronRight size={14} className={`transition-transform ${showAllEvents ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                    </button>
                  ) : (
                    <Link href="/events" className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group">
                       Svi događaji <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>

                {upcomingEvents.length === 0 ? (
                  <div className="bg-surface/30 border border-white/5 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center mx-auto mb-8 text-4xl opacity-10">🌙</div>
                    <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Trenutno nema događaja</h3>
                    <p className="text-muted text-[10px] font-bold uppercase tracking-widest max-w-sm mx-auto opacity-40">
                      Pratite ovaj lokal na mrežama za nova dešavanja.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-8 sm:grid-cols-2">
                    {(showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 4)).map((event: any) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>

              {/* KOMENTARI SECTION */}
              <section id="komentari" className="space-y-8 bg-card/20 border border-white/5 p-10 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                     <div className="w-8 h-px bg-primary" /> KOMENTARI ({venue._count?.comments || 0})
                  </h2>
                  <button className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group">
                     Prikaži sve <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <CommentSection venueId={venue.id} currentUser={user} />
              </section>

            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* STATUS CARD */}
            <div id="informacije" className="bg-card border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">STATUS</h3>
                     {venueStatus && (
                       <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${venueStatus.status === 'OPEN' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {venueStatus.label}
                       </div>
                     )}
                  </div>
                  
                  {venueStatus && (
                    <div className="flex gap-4">
                       <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                          <Clock size={20} />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">{venueStatus.label === 'OTVORENO' ? 'Radi do' : 'Otvara se u'}</p>
                          <p className="text-sm font-bold text-white uppercase">{venueStatus.subLabel?.split(' ').pop() || '–'}</p>
                       </div>
                    </div>
                  )}

                  <div className="h-px bg-white/5 w-full" />

                  <div className="space-y-4">
                     {venue.phone && (
                       <a href={`tel:${venue.phone}`} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                             <Phone size={18} />
                          </div>
                          <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">{venue.phone}</span>
                       </a>
                     )}
                     {venue.website && (
                       <a href={venue.website} target="_blank" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                             <Globe size={18} />
                          </div>
                          <span className="text-xs font-bold text-muted group-hover:text-white transition-colors truncate">{venue.website.replace(/^https?:\/\//, '')}</span>
                       </a>
                     )}
                     {venue.instagramUrl && (
                       <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                             <Instagram size={18} />
                          </div>
                          <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">Instagram Profil</span>
                       </a>
                     )}
                     {venue.facebookUrl && (
                       <a href={venue.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                             <Facebook size={18} />
                          </div>
                          <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">Facebook Profil</span>
                       </a>
                     )}
                     {venue.tiktokUrl && (
                       <a href={venue.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                             <TikTok size={18} />
                          </div>
                          <span className="text-xs font-bold text-muted group-hover:text-white transition-colors">TikTok Profil</span>
                       </a>
                     )}
                  </div>
               </div>
            </div>

            {/* RADNO VRIJEME CARD */}
            <div className="bg-card border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden group">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                     <Clock size={20} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">RADNO VRIJEME</h3>
               </div>

               <div className="space-y-4">
                  {['WEEKDAYS', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(group => {
                    const hours = venue.openingHours?.find((h: any) => h.dayGroup === group);
                    const label = group === 'WEEKDAYS' ? 'Radni dani (Pon-Čet)' : 
                                 group === 'FRIDAY' ? 'Petak' :
                                 group === 'SATURDAY' ? 'Subota' : 'Nedjelja';
                    return (
                      <div key={group} className="flex justify-between items-center text-xs">
                        <span className="text-muted font-bold uppercase tracking-widest text-[10px]">{label}</span>
                        <span className="text-white font-black">
                          {hours?.isClosed ? (
                            <span className="text-red-500/80 uppercase tracking-widest text-[10px]">Zatvoreno</span>
                          ) : (
                            <span className="tracking-widest">{hours?.openTime} – {hours?.closeTime}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* LOKACIJA CARD */}
            <div className="bg-card border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden group text-left">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                     <MapPin size={20} />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">LOKACIJA</h3>
               </div>
               
               <div className="space-y-6">
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">{venue.address}</p>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">{venue.city}, BiH</p>
                  </div>
                  
                  <div className="aspect-square rounded-3xl overflow-hidden border border-white/5 shadow-inner">
                     <div className="h-full w-full filter brightness-75 grayscale-[0.3] contrast-125">
                        <VenueLocation venue={venue} hideHeader={true} />
                     </div>
                  </div>
                  
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                    target="_blank"
                    className="w-full py-4 bg-surface border border-white/5 text-white font-black rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-lg group/nav"
                  >
                     Otvori u Google Maps <ExternalLink size={14} className="group-hover/nav:translate-x-1 group-hover/nav:-translate-y-1 transition-transform" />
                  </a>
               </div>
            </div>

            {/* POGODNOSTI CARD (Popuralni Tagovi in image) */}
            {venue.tags && venue.tags.length > 0 && (
              <div className="bg-card border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden group text-left">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                       <Heart size={20} />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">POGODNOSTI</h3>
                 </div>
                 
                 <div className="flex flex-wrap gap-2">
                    {venue.tags.map((tag: any) => (
                      <div key={tag.id} className="px-3 py-1.5 bg-surface border border-white/5 rounded-lg text-[10px] font-black text-muted uppercase tracking-widest hover:border-primary/50 transition-all cursor-default">
                         {tag.name}
                      </div>
                    ))}
                 </div>
              </div>
            )}
            
          </aside>
        </div>
        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          type="venue" 
          data={{
            id: venue.id,
            title: venue.name,
            slug: venue.slug,
            imageUrl: venue.imageUrl
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
}
