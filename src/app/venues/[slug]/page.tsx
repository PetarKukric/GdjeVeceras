'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Globe, Phone, MapPin, Clock, Tag as TagIcon, Car, Wifi, Utensils, Tv, Star, Music, Disc, Snowflake, Sun,
  Target, Accessibility, Shirt, Beer, Share2, Heart, ExternalLink, Navigation, Pencil, Zap, Moon,
} from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { VenueLocation } from '@/components/venues/VenueLocation';
import { VenueGallery } from '@/components/venues/VenueGallery';
import { CommentSection } from '@/components/comments/CommentSection';
import { ShareModal } from '@/components/share/ShareModal';
import { PartnerCheckInBanner } from '@/components/score/PartnerCheckInBanner';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/i18n/LangProvider';
import { getVenueStatus } from '@/lib/venue-utils';
import { initials } from '@/lib/score';
import { trackEvent } from '@/lib/analytics';

type IconProps = { size?: number; className?: string };
const Instagram = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const Facebook = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);
const TikTok = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
);

const TAG_ICONS: Record<string, React.ComponentType<IconProps>> = {
  'Parking': Car, 'Wi-Fi': Wifi, 'Hrana': Utensils, 'TV': Tv, 'Sportski prenosi': Tv, 'VIP': Star,
  'Live muzika': Music, 'Plesni podij': Disc, 'Klima': Snowflake, 'Terasa': Sun, 'Bašta': Sun,
  'Bilijar': Target, 'Pikado': Target,
  'Pristup za osobe sa invaliditetom': Accessibility, 'Garderoba': Shirt, 'Piće': Beer, 'Kokteli': Beer,
};

const DAY_GROUPS_SPLIT = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_GROUPS_SHORT = ['WEEKDAYS', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/* eslint-disable @typescript-eslint/no-explicit-any -- odgovor /api/venues/[slug] nema zajednički tip */
export default function VenuePage() {
  const { slug } = useParams();
  const { t } = useLang();
  const { showToast } = useToast();
  const [venue, setVenue] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [venueStatus, setVenueStatus] = useState<ReturnType<typeof getVenueStatus> | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [failedImage, setFailedImage] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [venueRes, sessionRes] = await Promise.all([fetch(`/api/venues/${slug}`), fetch('/api/auth/session')]);
      let venueData: any = null;
      if (venueRes.ok) {
        venueData = await venueRes.json();
        setVenue(venueData);
        trackEvent('view_venue', { venue_id: venueData.id }, `view-venue:${venueData.id}`);
        if (venueData.openingHours) setVenueStatus(getVenueStatus(venueData.openingHours));
      }
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setUser(sessionData.user);
        if (venueData) {
          const favRes = await fetch(`/api/favorites?userId=${sessionData.user.id}`);
          if (favRes.ok) setIsFavorited(((await favRes.json()).venueIds || []).includes(venueData.id));
        }
      }
    } catch {
      console.error('Error fetching venue');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { if (slug) fetchData(); }, [slug, fetchData]);

  const toggleFavorite = async () => {
    if (!user) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, venueId: venue.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.favorited);
        showToast(data.favorited ? t('venue.saved') : t('event.unsaved'));
      }
    } catch {}
  };

  if (loading) return (
    <main className="page"><div className="wrap"><div className="skel" style={{ minHeight: 420 }} /></div></main>
  );
  if (!venue) notFound();

  const upcomingEvents = venue.events || [];
  const isOwner = user && (user.id === venue.ownerId || user.role === 'ADMIN');
  const image = venue.imageUrl && !failedImage ? venue.imageUrl : null;
  const hasCoords = typeof venue.latitude === 'number' && typeof venue.longitude === 'number';
  const directions = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address} ${venue.city}`)}`;
  const groups = venue.openingHours?.some((h: any) => ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].includes(h.dayGroup)) ? DAY_GROUPS_SPLIT : DAY_GROUPS_SHORT;
  const links = [
    venue.phone && { href: `tel:${venue.phone}`, Icon: Phone, label: venue.phone },
    venue.website && { href: venue.website, Icon: Globe, label: venue.website.replace(/^https?:\/\//, '').replace(/\/$/, '') },
    venue.instagramUrl && { href: venue.instagramUrl, Icon: Instagram, label: 'Instagram' },
    venue.facebookUrl && { href: venue.facebookUrl, Icon: Facebook, label: 'Facebook' },
    venue.tiktokUrl && { href: venue.tiktokUrl, Icon: TikTok, label: 'TikTok' },
  ].filter(Boolean) as { href: string; Icon: React.ComponentType<IconProps>; label: string }[];
  const tabs = [
    ['o-lokalu', t('venue.tabAbout')],
    ['dogadjaji', `${t('venue.tabEvents')} (${upcomingEvents.length})`],
    ['galerija', t('venue.tabGallery')],
    ['komentari', `${t('venue.tabComments')} (${venue._count?.comments || 0})`],
    ['info', t('venue.tabInfo')],
  ];

  return (
    <main className="detail">
      {/* ============ HERO ============ */}
      <section className="wrap">
        <div className="dhero">
          <div className="dhero__bg" aria-hidden="true">
            {image
              ? <img src={image} alt="" fetchPriority="high" decoding="async" onError={() => setFailedImage(true)} />
              : <div className="dhero__fallback">{initials(venue.name)}</div>}
          </div>
          <div className="dhero__top">
            <Link href="/venues" className="dhero__back">← {t('nav.venues')}</Link>
            <div className="dhero__icons">
              <button onClick={() => setIsShareModalOpen(true)} aria-label={t('venue.share')}><Share2 size={18} aria-hidden="true" /></button>
              <button onClick={toggleFavorite} aria-pressed={isFavorited} aria-label={isFavorited ? t('venue.unsave') : t('venue.save')} className={isFavorited ? 'is-on' : ''}>
                <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="dhero__body">
            <div className="dhero__logo">{image ? <img src={image} alt="" /> : initials(venue.name)}</div>
            <div className="dhero__text">
              <p className="kicker">{venue.city}{venue.tags?.[0] ? ` · ${venue.tags[0].name}` : ''}</p>
              <h1 className="h1">{venue.name}</h1>
              <div className="chips-row">
                <span className="mchip"><MapPin size={15} aria-hidden="true" />{venue.address}</span>
                {venueStatus && venueStatus.status !== 'UNKNOWN' && (
                  <span className={`mchip ${venueStatus.status === 'OPEN' ? 'mchip--open' : 'mchip--closed'}`}>
                    <span className="dot" aria-hidden="true" />{venueStatus.label}{venueStatus.subLabel ? ` · ${venueStatus.subLabel}` : ''}
                  </span>
                )}
                {venue.isPartner && <span className="mchip mchip--pink"><Zap size={15} aria-hidden="true" />+{venue.checkInPoints ?? 100} {t('score.ptsAbbr')}</span>}
              </div>
            </div>
            <div className="dhero__cta">
              <a className="btn btn--white" href={directions} target="_blank" rel="noopener noreferrer"><Navigation className="ic" aria-hidden="true" />{t('venue.directions')}</a>
              {isOwner && <Link className="btn btn--ghost" href={`/admin/venues/${venue.slug}`}><Pencil className="ic" aria-hidden="true" />{t('venue.edit')}</Link>}
            </div>
          </div>
        </div>
      </section>

      {venue.isPartner && <div className="wrap" style={{ marginTop: 16 }}><PartnerCheckInBanner points={venue.checkInPoints ?? 100} /></div>}

      <nav className="dtabs" aria-label={t('venue.sectionsAria')}>
        <div className="wrap dtabs__inner">
          {tabs.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </div>
      </nav>

      <div className="wrap dgrid">
        <div className="dgrid__main">
          <section id="o-lokalu" className="dsec">
            <h2 className="dsec__title">{t('venue.about')}</h2>
            <p className="dsec__lead">{venue.description || t('venue.noDescription')}</p>
            {venue.tags?.length > 0 && (
              <div className="amen">
                {venue.tags.map((tag: any) => {
                  const Icon = TAG_ICONS[tag.name] || TagIcon;
                  return <span key={tag.id} className="amen__item"><Icon size={16} aria-hidden="true" />{tag.name}</span>;
                })}
              </div>
            )}
          </section>

          <section id="dogadjaji" className="dsec">
            <div className="dsec__head">
              <h2 className="dsec__title">{t('venue.upcoming')}</h2>
              {upcomingEvents.length > 4 && (
                <button className="link" onClick={() => setShowAllEvents(!showAllEvents)}>{showAllEvents ? t('venue.showLess') : t('venue.showAll')}</button>
              )}
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="empty"><Moon size={28} aria-hidden="true" style={{ margin: '0 auto 10px', opacity: .5 }} /><b>{t('venue.noEvents')}</b>{t('venue.noEventsText')}</div>
            ) : (
              <div className="events events--2">
                {(showAllEvents ? upcomingEvents : upcomingEvents.slice(0, 4)).map((event: any, i: number) => (
                  <EventCard key={`${event.id}-${event.occurrenceDate || ''}`} event={event} index={i} />
                ))}
              </div>
            )}
          </section>

          <section id="galerija" className="dsec">
            <div className="dsec__head">
              <h2 className="dsec__title">{t('venue.gallery')}</h2>
              {venue.images?.length > 8 && (
                <button className="link" onClick={() => setShowAllGallery(!showAllGallery)}>{showAllGallery ? t('venue.showLess') : t('venue.showAll')}</button>
              )}
            </div>
            <VenueGallery venueId={venue.id} ownerId={venue.ownerId} images={venue.images || []} currentUser={user} onRefresh={fetchData} hideHeader limit={showAllGallery ? undefined : 8} />
          </section>

          <section id="komentari" className="dsec">
            <h2 className="dsec__title">{t('venue.comments')} <span className="pg__count">{venue._count?.comments || 0}</span></h2>
            <CommentSection venueId={venue.id} currentUser={user} />
          </section>
        </div>

        <aside id="info" className="dgrid__side">
          <div className="dcard">
            <p className="panel__title"><span><Clock size={15} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('venue.hours')}</span>
              {venueStatus && venueStatus.status !== 'UNKNOWN' && <span className={`mchip ${venueStatus.status === 'OPEN' ? 'mchip--open' : 'mchip--closed'}`}><span className="dot" aria-hidden="true" />{venueStatus.label}</span>}
            </p>
            {venue.openingHours?.length ? (
              <dl className="hours">
                {groups.map((group) => {
                  const hours = venue.openingHours.find((h: any) => h.dayGroup === group);
                  return (
                    <div key={group}>
                      <dt>{t(`days.${group}`)}</dt>
                      <dd>{!hours ? '—' : hours.isClosed ? <span className="hours__closed">{t('venue.closed')}</span> : `${hours.openTime} – ${hours.closeTime}`}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : <p className="ci-note" style={{ margin: 0, textAlign: 'left' }}>{t('venue.noHours')}</p>}
          </div>

          <div className="dcard">
            <p className="panel__title">{t('venue.location')}</p>
            <p className="dcard__addr"><b>{venue.address}</b><span>{venue.city}</span></p>
            {hasCoords && <div className="dcard__map"><VenueLocation venue={venue} hideHeader /></div>}
            <a className="btn btn--ghost btn--block btn--sm" href={directions} target="_blank" rel="noopener noreferrer">{t('venue.openMaps')} <ExternalLink className="ic" aria-hidden="true" /></a>
          </div>

          {links.length > 0 && (
            <div className="dcard">
              <p className="panel__title">{t('venue.contact')}</p>
              <div className="dlinks">
                {links.map(({ href, Icon, label }) => (
                  <a key={href} href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer">
                    <span className="dlinks__ic"><Icon size={18} /></span><span className="dlinks__label">{label}</span>
                  </a>
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
        data={{ id: venue.id, title: venue.name, slug: venue.slug, imageUrl: venue.imageUrl }}
      />
    </main>
  );
}
