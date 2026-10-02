'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Heart, MapPin } from 'lucide-react';
import { Event } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/i18n/LangProvider';
import { PosterArt, posterFor } from '@/components/ui/PosterArt';
import { PointsBadge } from '@/components/score/PointsBadge';
import { intlLocale } from '@/lib/i18n';
import { POPULARITY_THRESHOLD } from '@/lib/constants';
import { goSignup } from '@/lib/guest';

const TZ = 'Europe/Sarajevo';

interface EventCardProps {
  event: Event;
  variant?: 'featured' | 'compact';
  isFavoritedInitial?: boolean;
  onFavoriteToggle?: (eventId: string, favorited: boolean) => void;
  showPopularBadge?: boolean;
  index?: number;
}

export function EventCard({ event, variant = 'compact', isFavoritedInitial = false, onFavoriteToggle, index = 0 }: EventCardProps) {
  const { t, lang } = useLang();
  const [saved, setSaved] = useState(isFavoritedInitial);
  const [busy, setBusy] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const [live, setLive] = useState(false);
  const { showToast } = useToast();
  useEffect(() => setSaved(isFavoritedInitial), [isFavoritedInitial]);
  useEffect(() => setFailedImage(false), [event.imageUrl, event.venue?.imageUrl]);
  // "Uživo" se računa tek na klijentu (izbjegava hydration razliku u vremenu)
  useEffect(() => {
    const now = Date.now();
    setLive(new Date(event.startDateTime).getTime() <= now && Boolean(event.endDateTime) && new Date(event.endDateTime).getTime() > now);
  }, [event.startDateTime, event.endDateTime]);

  const href = `/events/${event.slug}${event.occurrenceDate ? `?date=${event.occurrenceDate}` : ''}`;
  const image = !failedImage && (event.imageUrl || event.venue?.imageUrl);
  const start = new Date(event.startDateTime);
  const locale = intlLocale(lang);
  const weekday = new Intl.DateTimeFormat(locale, { timeZone: TZ, weekday: 'short' }).format(start).replace('.', '');
  const day = new Intl.DateTimeFormat(locale, { timeZone: TZ, day: 'numeric' }).format(start).replace('.', '');
  const time = new Intl.DateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(start);
  const hot = (event._count?.favorites || 0) >= POPULARITY_THRESHOLD;
  const genre = t(`categories.${event.category}`);

  async function toggleFavorite() {
    if (busy) return;
    setBusy(true);
    try {
      const session = await fetch('/api/auth/session');
      if (!session.ok) { goSignup('save'); return; }
      const user = await session.json();
      const response = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.user.id, eventId: event.id }) });
      if (!response.ok) throw new Error('favorite');
      const result = await response.json();
      setSaved(result.favorited);
      onFavoriteToggle?.(event.id, result.favorited);
      showToast(result.favorited ? t('event.saved') : t('event.unsaved'));
    } catch { showToast(t('event.saveFailed'), 'error'); }
    finally { setBusy(false); }
  }

  return (
    <article className="event" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <div className="event__poster">
        {image ? (
          <>
            <img className="event__img" src={image} alt="" loading={variant === 'featured' || index < 3 ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedImage(true)} />
            <span className="event__shade" aria-hidden="true" />
          </>
        ) : <PosterArt seed={event.id} />}
        <div className="event__date" aria-hidden="true"><small>{weekday}</small><b>{day}</b></div>
        <button className="event__fav" onClick={toggleFavorite} disabled={busy} aria-pressed={saved} aria-label={saved ? t('event.unsaveAria', { title: event.title }) : t('event.saveAria', { title: event.title })}>
          <Heart size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <span className="event__genre" style={{ color: image ? '#fff' : posterFor(event.id).text }}>{genre}</span>
        {live ? <span className="tag-hot tag-live">{t('event.live')}</span> : hot ? <span className="tag-hot">{t('event.hot')}</span> : null}
      </div>
      <div className="event__body">
        <h3 className="event__title"><Link href={href}>{event.title}</Link></h3>
        {event.performers && <p className="event__perf">{event.performers}</p>}
        <div className="event__meta">
          <span><MapPin className="ic" aria-hidden="true" />{event.venue?.name || t('event.noVenue')}{event.venue?.city ? ` · ${event.venue.city}` : ''}</span>
          <span><Clock className="ic" aria-hidden="true" />{time}</span>
          {typeof event.price === 'number' && event.price > 0
            ? <span className="event__price">{event.price} {event.currency || 'KM'}</span>
            : event.price === 0 ? <span className="event__price">{t('event.free')}</span> : null}
        </div>
        <div className="event__foot">
          <div className="event__going">
            {event._count?.favorites ? <span>{t('event.savedBy', { n: event._count.favorites })}</span> : null}
          </div>
          <PointsBadge venue={event.venue} />
        </div>
      </div>
    </article>
  );
}
