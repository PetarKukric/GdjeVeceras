'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Heart, MapPin, Music2 } from 'lucide-react';
import { Event } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { formatEventCardDate } from '@/lib/date-format';
import { trackEvent } from '@/lib/analytics';
interface EventCardProps {
  event: Event;
  variant?: 'featured' | 'compact';
  isFavoritedInitial?: boolean;
  onFavoriteToggle?: (eventId: string, favorited: boolean) => void;
  showPopularBadge?: boolean;
}
export function EventCard({ event, variant = 'compact', isFavoritedInitial = false, onFavoriteToggle }: EventCardProps) {
  const [saved, setSaved] = useState(isFavoritedInitial);
  const [busy, setBusy] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  const { showToast } = useToast();
  useEffect(() => setSaved(isFavoritedInitial), [isFavoritedInitial]);
  useEffect(() => setFailedImage(false), [event.imageUrl, event.venue?.imageUrl]);
  const href = `/events/${event.slug}${event.occurrenceDate ? `?date=${event.occurrenceDate}` : ''}`;
  const image = !failedImage && (event.imageUrl || event.venue?.imageUrl);
  async function toggleFavorite() {
    if (busy) return;
    setBusy(true);
    try {
      const session = await fetch('/api/auth/session');
      if (!session.ok) { window.location.href = '/login'; return; }
      const user = await session.json();
      const response = await fetch('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.user.id, eventId: event.id }) });
      if (!response.ok) throw new Error('favorite');
      const result = await response.json();
      setSaved(result.favorited);
      onFavoriteToggle?.(event.id, result.favorited);
      showToast(result.favorited ? 'Događaj sačuvan' : 'Uklonjeno iz sačuvanih');
    } catch { showToast('Čuvanje nije uspjelo. Pokušaj ponovo.'); }
    finally { setBusy(false); }
  }
  return <article className={`event-card event-card--${variant}`}>
    <Link href={href} className="event-card__image" aria-label={`Pogledaj: ${event.title}`}>
      {image ? <img src={image} alt="" loading="lazy" onError={() => setFailedImage(true)} /> : <Music2 size={32} aria-hidden="true" />}
    </Link>
    <div className="event-card__body">
      <Link href={href}><h3>{event.title}</h3></Link>
      {event.performers && <p className="event-card__performer">{event.performers}</p>}
      <p className="event-card__meta"><MapPin size={15} /><span>{event.venue?.name || 'Lokacija nije navedena'}{event.venue?.city ? ` · ${event.venue.city}` : ''}</span></p>
      <p className="event-card__meta"><Calendar size={15} /><span>{formatEventCardDate(event.startDateTime)}</span></p>
      {event.additionalVenues?.length ? <p className="event-card__performer">+ {event.additionalVenues.map(v => v.venue.name).join(', ')}</p> : null}
      <div className="event-card__labels">
        {typeof event.price === 'number' && event.price > 0 && <span>{event.price} {event.currency || 'KM'}</span>}
        {event.venue?.reservationsEnabled && <Link href={`${href}#reservation`} onClick={() => trackEvent('reservation_click', { event_id: event.id, source: 'event_card' })}>Rezerviši sto</Link>}
      </div>
    </div>
    <button className="event-card__save" onClick={toggleFavorite} disabled={busy} aria-pressed={saved} aria-label={saved ? 'Ukloni iz sačuvanih' : 'Sačuvaj događaj'}><Heart size={22} fill={saved ? 'currentColor' : 'none'} /></button>
  </article>;
}
