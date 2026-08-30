'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { 
  Calendar, 
  Check,
  Flag,
  Clock, 
  MapPin, 
  Tag, 
  Ticket, 
  Bookmark, 
  Info,
  ExternalLink,
  Heart,
  AlertTriangle,
  Send,
  Share2,
  Users,
  Music,
  Disc,
  Disc3,
  Guitar,
  ChevronRight,
  Car,
  Wifi,
  Utensils,
  Tv,
  Star,
  Snowflake,
  Sun,
  CalendarCheck,
  Target,
  Accessibility,
  Shirt,
  Beer,
  Tag as TagIcon,
  Loader2,
  Sparkles
} from 'lucide-react';
import {} from '@/lib/services';
import { BottomNav } from '@/components/layout/BottomNav';
import {} from '@/components/events/EventCard';
import { VenueLocation } from '@/components/venues/VenueLocation';
import { CommentSection } from '@/components/comments/CommentSection';
import Link from 'next/link';
import { ShareModal } from '@/components/share/ShareModal';
import { LiveFeed } from '@/components/events/LiveFeed';
import { ReservationModal } from '@/components/events/ReservationModal';
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

export default function EventPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportText, setReportReasonText] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('detalji');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [floorItems, setFloorItems] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchSession() {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const result = await res.json();
        setUser(result.user);
      }
    }
    fetchSession();
  }, []);

  useEffect(() => {
    async function fetchEvent() {
      if (!slug) return;
      try {
        const dateParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('date') : null;
        const res = await fetch('/api/events/' + slug + (dateParam ? '?date=' + dateParam : ''));
        if (res.ok) {
          const result = await res.json();
          setData(result);
          
          // Fetch availability
          const floorRes = await fetch('/api/events/' + slug + '/floor-plan' + (dateParam ? '?date=' + dateParam : ''));
          if (floorRes.ok) {
            const floorData = await floorRes.json();
            setFloorItems(floorData);
          }
        }
      } catch {}
      setLoading(false);
    }
    fetchEvent();
  }, [slug]);

  const toggleFavorite = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        window.location.href = '/login';
        return;
      }
      const session = await sessionRes.json();
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, eventId: data.event.id })
      });
      if (res.ok) {
        const result = await res.json();
        setIsFavorited(result.favorited);
        showToast(result.favorited ? 'Događaj sačuvan' : 'Uklonjeno iz sačuvanih');
      }
    } catch {}
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        window.location.href = '/login';
        return;
      }
      const session = await sessionRes.json();
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          eventId: data.event.id, 
          userId: session.user.id,
          reason: reportReason,
          description: reportText 
        })
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => setIsReporting(false), 2000);
      }
    } catch {}
  };

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

  if (loading) return (
    <div className="min-h-screen bg-background text-text flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  if (!data) notFound();

  const { event, related } = data;
  const startDate = new Date(event.startDateTime);
  const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
  const isOwner = user && (user.id === event.venue?.ownerId || user.role === 'ADMIN');

  const availableUnits = floorItems.filter(i => (i.type === 'TABLE' || i.type === 'BOOTH') && i.status === 'AVAILABLE' && !i.groupId).length;
  const totalUnits = floorItems.filter(i => (i.type === 'TABLE' || i.type === 'BOOTH') && !i.groupId).length;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <main className="flex-grow pb-28 md:pb-24 animate-fade-up">
        {/* BREADCRUMBS */}
        <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
           <Link href="/" className="hover:text-primary transition-colors">Početna</Link>
           <ChevronRight size={10} />
           <Link href="/events" className="hover:text-primary transition-colors">Događaji</Link>
           <ChevronRight size={10} />
           <span className="text-white truncate max-w-[200px]">{event.title}</span>
        </nav>

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-6">
          
          {/* LEFT COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-10 md:space-y-8">
            
            {/* HERO CARD */}
            <div className="relative rounded-3xl sm:rounded-3xl overflow-hidden bg-card border border-white/5 shadow-2xl group">
              <div className="aspect-[16/9] sm:aspect-[21/9] relative">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-surface via-background to-surface relative flex items-center justify-center overflow-hidden">
                     <div className="absolute top-0 right-0 w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
                     <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-[100px]" />
                     <div className="relative flex flex-col items-center gap-4">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                           {event.category === 'PARTY' ? <Disc3 size={44} /> : <Guitar size={44} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">
                           {event.category === 'PARTY' ? 'Žurka' : 'Muzika uživo'}
                        </span>
                     </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,110,0.1),transparent_50%)]" />
                
                {/* Badge Top Left */}
                <div className="absolute top-6 left-6">
                   <div className="px-4 py-1.5 bg-primary/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-white border border-white/10 shadow-lg">
                      Istaknuto
                   </div>
                </div>

                {/* Floating Actions Top Right */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-3">
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

                {/* Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
                   <div className="w-20 h-24 sm:w-24 sm:h-28 bg-white text-background rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-2xl">
                      <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
                         {startDate.toLocaleDateString('bs', { weekday: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-3xl sm:text-4xl font-black leading-none">
                         {startDate.getDate()}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">
                         {startDate.toLocaleDateString('bs', { month: 'short' }).toUpperCase()}
                      </span>
                   </div>
                   <div className="flex-grow">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-none uppercase tracking-tighter mb-4 text-shadow-lg">
                        {event.title} <br className="hidden sm:block" />
                        <span className="text-primary/90">@ {event.venue.name}</span>
                      </h1>
                      <div className="flex flex-wrap gap-3">
                         <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Disc size={12} className="text-primary" /> {event.category === 'PARTY' ? 'Tech House' : 'Pop / Rock'}
                         </div>
                         <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Music size={12} className="text-primary" /> {event.category === 'PARTY' ? 'Party' : 'Svirka'}
                         </div>
                         <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <Users size={12} className="text-primary" /> Noćni život
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex items-center gap-8 border-b border-white/5 overflow-x-auto scrollbar-hide py-2 px-4">
               {[
                 { id: 'detalji', label: 'Detalji' },
                 { id: 'lokacija', label: 'Lokacija' },
                 { id: 'komentari', label: 'Komentari' },
                 { id: 'organizator', label: 'Organizator' },
               ].map((tab) => (
                 <button 
                   key={tab.id}
                   onClick={() => scrollToSection(tab.id)}
                   className={`text-[10px] font-black uppercase tracking-[0.2em] pb-4 transition-all relative shrink-0 ${activeTab === tab.id ? 'text-primary' : 'text-muted hover:text-white'}`}
                 >
                   {tab.label} {tab.id === 'komentari' && `(${event._count?.comments || 0})`}
                   {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(255,0,110,0.5)]" />}
                 </button>
               ))}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="space-y-16 py-8">
              
              {/* O DOGAĐAJU */}
              <section id="detalji" className="space-y-8 text-left">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(255,0,110,0.8)]" />
                   <h2 className="text-2xl font-black uppercase tracking-tight">O događaju</h2>
                </div>
                
                <div className="space-y-6">
                  <p className="text-muted leading-relaxed font-medium text-lg">
                    {event.description || 'Spremi se za nezaboravnu noć uz Gdje Večeras!'}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                     <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                           <Calendar size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Datum</p>
                           <p className="text-xs font-bold text-white uppercase">{startDate.toLocaleDateString('bs', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                           <Clock size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Vrijeme</p>
                           <p className="text-xs font-bold text-white uppercase">
                              {startDate.toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}
                              {endDate && ` - ${endDate.toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}`}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                           <Tag size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Kategorija</p>
                           <p className="text-xs font-bold text-white uppercase">{event.category}, Party</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                           <Users size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Uzrast</p>
                           <p className="text-xs font-bold text-white uppercase">{event.minimumAge ? `${event.minimumAge}+` : 'Svi'}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-card border border-white/5 flex items-center justify-center text-primary shadow-xl group-hover:scale-110 transition-transform">
                           <Disc size={18} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Dress code</p>
                           <p className="text-xs font-bold text-white uppercase">
                              {event.dressCodeType === 'SPECIAL' ? event.dressCodeName : 
                               event.dressCodeType === 'ELEGANT' ? 'Elegantno' : 
                               event.dressCodeType === 'CASUAL' ? 'Casual' : 'Casual / Nightlife'}
                           </p>
                        </div>
                     </div>
                  </div>

                  {event.dressCodeType !== 'NONE' && event.dressCodeDescription && (
                    <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-3xl space-y-3">
                       <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                          <Shirt size={14} /> Detalji o dress code-u
                       </h4>
                       <p className="text-sm font-medium text-white/80 leading-relaxed uppercase tracking-wide italic">
                          &quot;{event.dressCodeDescription}&quot;
                       </p>
                    </div>
                  )}
                </div>
              </section>

              {/* LIVE FEED SECTION */}
              <section id="live-feed" className="bg-card/20 border border-white/5 p-10 rounded-3xl shadow-xl">
                 <LiveFeed 
                    eventSlug={slug} 
                    isOwner={isOwner} 
                    isLive={new Date() >= startDate && (!endDate || new Date() <= endDate)} 
                 />
              </section>

              {/* ORGANIZATOR */}
              <section id="organizator" className="space-y-8 text-left">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(255,0,110,0.8)]" />
                   <h2 className="text-2xl font-black uppercase tracking-tight">Organizator</h2>
                </div>
                
                <div className="bg-card/50 border border-white/5 rounded-3xl p-6 flex items-center gap-6 group hover:border-primary/20 transition-all shadow-xl">
                   <div className="w-20 h-20 rounded-2xl bg-surface border border-white/5 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                      {event.venue.imageUrl ? (
                        <img src={event.venue.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : <Disc size={28} className='opacity-40' />}
                   </div>
                   <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                         <h4 className="text-lg font-black text-white uppercase tracking-tight">{event.venue.name}</h4>
                         <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-white"><Check size={10} strokeWidth={3} /></div>
                      </div>
                      <Link href={`/venues/${event.venue.slug}`} className="px-5 py-2 bg-accent/20 text-accent text-[10px] font-black rounded-lg hover:bg-accent hover:text-white transition-all uppercase tracking-widest border border-accent/30 shadow-lg inline-block">
                         Pogledaj profil
                      </Link>
                   </div>
                </div>

                {(event.additionalVenues && event.additionalVenues.length > 0) && (
                  <div className="space-y-3 mt-2">
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users size={14} /> Zajednički događaj — održava se i u:
                     </p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {event.additionalVenues.map((av: any) => (
                          <div key={av.id} className="bg-card/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/20 transition-all">
                             <div className="w-12 h-12 rounded-xl bg-surface border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                {av.venue.imageUrl ? (
                                  <img src={av.venue.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <MapPin size={18} className="text-primary" />
                                )}
                             </div>
                             <div className="flex-grow min-w-0">
                                <p className="text-sm font-black text-white uppercase tracking-tight truncate">{av.venue.name}</p>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5">{av.venue.city || ''}{av.venue.address ? ' · ' + av.venue.address : ''}</p>
                             </div>
                             <Link href={`/venues/${av.venue.slug}`} className="px-3 py-1.5 bg-white/5 border border-white/10 text-[10px] font-black text-muted hover:text-white uppercase tracking-widest rounded-lg transition-all shrink-0">
                                Profil
                             </Link>
                          </div>
                        ))}
                     </div>
                  </div>
                )}
              </section>

              {/* O LOKALU */}
              <section className="space-y-8 text-left">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(255,0,110,0.8)]" />
                   <h2 className="text-2xl font-black uppercase tracking-tight">O lokalu</h2>
                </div>
                
                <div className="space-y-6">
                   <p className="text-muted leading-relaxed font-medium text-sm">
                      {event.venue.description || 'Nema opisa za ovaj lokal.'}
                   </p>
                   
                   {event.venue.tags && event.venue.tags.length > 0 ? (
                     <div className="flex flex-wrap gap-4">
                        {event.venue.tags.map((tag: any) => {
                          const Icon = TAG_ICONS[tag.name] || TagIcon;
                          return (
                            <div key={tag.id} className="px-4 py-2 bg-card/50 border border-white/5 rounded-2xl flex items-center gap-2.5 text-[10px] font-black text-muted uppercase tracking-widest shadow-lg">
                               <Icon size={14} className="text-primary" /> {tag.name}
                            </div>
                          );
                        })}
                     </div>
                   ) : (
                     <p className="text-[10px] font-bold text-muted uppercase tracking-widest italic">Nema dodatnih informacija o pogodnostima.</p>
                   )}
                </div>
              </section>

              {/* KOMENTARI SECTION */}
              <section id="komentari" className="pt-8 border-t border-white/5 text-left">
                <CommentSection eventId={event.id} currentUser={user} />
              </section>

              <div className="flex justify-center pt-8">
                 <button 
                  onClick={() => setIsReporting(true)}
                  className="px-6 py-3 rounded-2xl border border-white/5 text-muted hover:text-red-400 text-[10px] font-black uppercase tracking-[0.3em] transition-all bg-card/30"
                >
                  <Flag size={12} className="inline mr-1 -mt-0.5" />Prijavi problem sa ovim događajem
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN (4 cols) */}
          <aside className="lg:col-span-4 space-y-10 md:space-y-8">
            
            {/* INFO CARD */}
            <div className="bg-card border border-white/5 rounded-3xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 sm:space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
               
               <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                  Informacije
               </h3>

               <div className="space-y-6">
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <MapPin size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Lokacija</p>
                        <p className="text-sm font-bold text-white uppercase">{event.venue.name}</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <Info size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Adresa</p>
                        <p className="text-sm font-bold text-white uppercase">{event.venue.address}, {event.venue.city}</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <Calendar size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Datum</p>
                        <p className="text-sm font-bold text-white uppercase">{startDate.toLocaleDateString('bs', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <Clock size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Vrijeme</p>
                        <p className="text-sm font-bold text-white uppercase">
                           {startDate.toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}
                           {endDate && ` – ${endDate.toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <Users size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Uzrast</p>
                        <p className="text-sm font-bold text-white uppercase">{event.minimumAge ? `${event.minimumAge}+` : 'Svi'}</p>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface border border-white/5 flex items-center justify-center text-primary shrink-0 shadow-lg">
                        <Ticket size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-0.5">Cijena</p>
                        <p className="text-sm font-bold text-white uppercase">{event.price === 0 ? 'Ulaz besplatan' : `${event.price} KM`}</p>
                     </div>
                  </div>
               </div>

               {totalUnits > 0 && (
                  <div className="p-5 bg-surface border border-white/5 rounded-3xl space-y-3">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Dostupnost stolova</p>
                        <span className={`text-[10px] font-black uppercase ${availableUnits > 0 ? 'text-green-500' : 'text-red-500'}`}>
                           {availableUnits > 0 ? 'Dostupno' : 'Popunjeno'}
                        </span>
                     </div>
                     <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                           className={`h-full transition-all duration-1000 ${availableUnits > 0 ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}
                           style={{ width: `${(availableUnits / totalUnits) * 100}%` }}
                        />
                     </div>
                     <p className="text-[10px] font-bold text-muted uppercase tracking-widest text-center">
                        {availableUnits} od {totalUnits} jedinica slobodno
                     </p>
                  </div>
               )}

               <div className="space-y-5 md:space-y-4 pt-6 md:pt-4">
                  {event.venue?.reservationsEnabled && (
                  <button 
                    onClick={() => setIsReservationModalOpen(true)}
                    disabled={availableUnits === 0 && totalUnits > 0}
                    className="w-full py-5 bg-white text-background font-black rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-2xl disabled:opacity-50 disabled:grayscale"
                  >
                     {availableUnits === 0 && totalUnits > 0 ? 'SVE POPUNJENO' : 'REZERVIŠI STO / SEPARE'}
                  </button>
                  )}

                  <button 
                    onClick={toggleFavorite}
                    className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${isFavorited ? 'bg-primary text-white shadow-primary/20' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:scale-[1.02]'}`}
                  >
                     {isFavorited ? <Heart fill="white" size={18} /> : <Bookmark size={18} />} 
                     {isFavorited ? 'Sačuvano u tvojoj kolekciji' : 'SAČUVAJ DOGAĐAJ'}
                  </button>
                  {event._count?.favorites > 0 && (
                    <p className="text-center text-[10px] font-black text-muted uppercase tracking-[0.2em]">
                      Sačuvalo {event._count.favorites} korisnika
                    </p>
                  )}
                  <button 
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-full py-5 bg-surface border border-white/5 text-white font-black rounded-[1.25rem] hover:bg-white/5 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-lg group/share"
                  >
                     <Share2 size={18} className="group-hover/share:scale-110 transition-transform" /> Podijeli događaj
                  </button>
                  {isOwner && (
                    <Link
                      href={`/admin/reservations?event=${event.id}`}
                      className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-[1.25rem] flex items-center justify-center gap-3 hover:bg-white/10 transition-all uppercase tracking-[0.2em] text-[10px]"
                    >
                       <CalendarCheck size={18} className="text-primary" /> Rezervacije za događaj
                    </Link>
                  )}
                  {event.ticketUrl && (
                    <a href={event.ticketUrl} target="_blank" className="w-full py-5 bg-primary text-white font-black rounded-[1.25rem] flex items-center justify-center gap-3 hover:bg-primary-hover transition-colors shadow-xl shadow-primary/20 uppercase tracking-[0.2em] text-[10px]">
                       <Ticket size={18} /> KUPI KARTU
                    </a>
                  )}
               </div>
            </div>

            {/* SMALL MAP CARD */}
            <div id="lokacija" className="bg-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl text-left">
               <div className="p-8">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6">
                     Lokacija na mapi
                  </h3>
                  <div className="relative rounded-[1.5rem] overflow-hidden border border-white/5 shadow-inner">
                     <div className="h-[250px] w-full filter brightness-90 grayscale-[0.5] contrast-125">
                        <VenueLocation venue={event.venue} />
                     </div>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${event.venue.latitude},${event.venue.longitude}`}
                    target="_blank"
                    className="w-full mt-6 py-4 bg-surface border border-white/5 text-white font-black rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-lg group"
                  >
                     Otvori u Google Maps <ExternalLink size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
               </div>
            </div>

            {/* RELATED EVENTS SIDEBAR */}
            <div className="space-y-6 text-left">
               <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">
                     {user ? 'Možda će ti se svidjeti' : 'Slični događaji'}
                  </h3>
                  <Link href="/events" className="text-primary text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">
                     Pogledaj sve
                  </Link>
               </div>
               
               <div className="space-y-4">
                  {related.similarEvents.length > 0 ? related.similarEvents.slice(0, 3).map((e: any) => (
                    <Link key={e.id} href={`/events/${e.slug}`} className="bg-card/40 backdrop-blur-sm border border-white/5 p-4 rounded-3xl flex items-center gap-4 hover:border-primary/30 transition-all group shadow-xl">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 relative">
                          <img src={e.imageUrl || '/hero-bg.jpg'} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[7px] font-black text-white uppercase">
                             {new Date(e.startDateTime).toLocaleDateString('bs', { weekday: 'short' })}
                          </div>
                       </div>
                       <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{e.title}</h4>
                          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5 line-clamp-1">{e.venue.name}</p>
                          {e.recommendationReason && (
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mt-1"><Sparkles size={10} className="inline mr-1 -mt-0.5" /> {e.recommendationReason}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center gap-1.5 text-[10px] font-black text-white uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> 
                                {new Date(e.startDateTime).getDate()} {new Date(e.startDateTime).toLocaleDateString('bs', { month: 'short' })}
                             </div>
                             <span className="text-[10px] font-bold text-muted">{new Date(e.startDateTime).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                       </div>
                    </Link>
                  )) : (
                    <div className="text-center py-8 text-muted text-[10px] font-black uppercase tracking-[0.2em]">Nema sličnih događaja</div>
                  )}
               </div>

               {/* Related Footer Pagination Dummy */}
               <div className="flex justify-center gap-2 pt-2">
                  <div className="w-8 h-1 rounded-full bg-primary shadow-glow" />
                  <div className="w-2 h-1 rounded-full bg-white/10" />
                  <div className="w-2 h-1 rounded-full bg-white/10" />
               </div>
            </div>
            
          </aside>
        </div>

        {/* REPORT MODAL (PRESERVED) */}
        {isReporting && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-card border border-white/10 rounded-3xl p-10 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle size={24} />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tight">Prijavi problem</h3>
              </div>
              
              {reportSuccess ? (
                  <div className="py-12 text-center text-green-500 font-black uppercase tracking-widest animate-fade-up">
                     <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send size={32} />
                     </div>
                     Hvala! Prijava poslata.
                  </div>
              ) : (
                  <form onSubmit={submitReport} className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Razlog prijave</label>
                         <select 
                            className="w-full bg-surface/50 border border-white/5 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:border-primary transition-all text-white appearance-none cursor-pointer"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                         >
                            <option value="event_cancelled">Događaj otkazan</option>
                            <option value="wrong_date">Pogrešan datum</option>
                            <option value="wrong_price">Pogrešna cijena</option>
                            <option value="other">Ostalo</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Detaljan opis</label>
                         <textarea 
                            className="w-full bg-surface/50 border border-white/5 rounded-2xl p-5 text-sm font-medium min-h-[120px] focus:outline-none focus:border-primary transition-all text-white placeholder:text-muted/30"
                            placeholder="Molimo opišite problem..."
                            value={reportText}
                            onChange={(e) => setReportReasonText(e.target.value)}
                            required
                         />
                      </div>
                      <div className="flex gap-4 pt-2">
                          <button type="button" onClick={() => setIsReporting(false)} className="flex-grow py-4 bg-surface border border-white/5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/5 transition-all">Odustani</button>
                          <button type="submit" className="flex-grow py-4 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all">
                             Pošalji <Send size={14} />
                          </button>
                      </div>
                  </form>
              )}
            </div>
          </div>
        )}

        <ShareModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          type="event" 
          data={{
            id: event.id,
            title: event.title,
            slug: event.slug,
            imageUrl: event.imageUrl,
            date: (event as any).occurrenceDate || undefined
          }}
        />

        <ReservationModal 
          isOpen={isReservationModalOpen}
          onClose={() => setIsReservationModalOpen(false)}
          event={event}
          user={user}
        />
      </main>

      {/* STICKY MOBILNI CTA — samo ako lokal prima rezervacije */}
      {event.venue?.reservationsEnabled && (
      <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 px-4">
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl shadow-black/60 flex items-center gap-3 p-3">
          <button
            onClick={toggleFavorite}
            aria-label="Sačuvaj događaj"
            className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all ${isFavorited ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted'}`}
          >
            <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setIsReservationModalOpen(true)}
            disabled={availableUnits === 0 && totalUnits > 0}
            className="flex-grow h-12 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {availableUnits === 0 && totalUnits > 0 ? 'Sve popunjeno' : 'Rezerviši mjesto'}
          </button>
        </div>
      </div>
      )}
      <BottomNav />
    </div>
  );
}
