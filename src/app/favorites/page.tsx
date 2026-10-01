'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Heart, MapPin } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { VenueCard } from '@/components/venues/VenueCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLang } from '@/components/i18n/LangProvider';
import { Event, Venue } from '@/types';

export default function FavoritesPage() {
  const { t } = useLang();
  const [favorites, setFavorites] = useState<{ events: Event[]; venues: Venue[] }>({ events: [], venues: [] });
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [tab, setTab] = useState<'events' | 'venues'>('events');

  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) { setLoggedIn(false); return; }
        const session = await sessionRes.json();
        const res = await fetch(`/api/favorites?userId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          // Prošli događaji idu na kraj — najbliži izlazak je prvi
          const now = Date.now();
          const events: Event[] = [...(data.events || [])].sort((a: Event, b: Event) => {
            const ta = new Date(a.startDateTime).getTime(), tb = new Date(b.startDateTime).getTime();
            const pa = ta < now, pb = tb < now;
            return pa === pb ? (pa ? tb - ta : ta - tb) : pa ? 1 : -1;
          });
          setFavorites({ events, venues: data.venues || [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onEventToggle = (eventId: string, favorited: boolean) => {
    if (!favorited) setFavorites((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== eventId) }));
  };

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker"><Heart size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{t('favorites.kicker')}</p>
            <h1 className="h1">{t('nav.saved')}</h1>
            <p className="lead">{t('favorites.lead')}</p>
          </div>
          <div className="seg" style={{ marginTop: 0 }} role="group" aria-label={t('favorites.tabsAria')}>
            <button type="button" className="seg__btn" aria-pressed={tab === 'events'} onClick={() => setTab('events')}>
              <Calendar size={15} aria-hidden="true" />&nbsp;{t('nav.events')} <span className="seg__count">{favorites.events.length}</span>
            </button>
            <button type="button" className="seg__btn" aria-pressed={tab === 'venues'} onClick={() => setTab('venues')}>
              <MapPin size={15} aria-hidden="true" />&nbsp;{t('nav.venues')} <span className="seg__count">{favorites.venues.length}</span>
            </button>
          </div>
        </div>

        {!loggedIn ? (
          <div className="empty">
            <b>{t('favorites.guestTitle')}</b>{t('favorites.guestText')}
            <div style={{ marginTop: 18 }}><Link className="btn btn--pink btn--sm" href="/login?next=/favorites">{t('nav.login')}</Link></div>
          </div>
        ) : loading ? (
          <div className="events">{[0, 1, 2].map((i) => <div key={i} className="skel" />)}</div>
        ) : tab === 'events' ? (
          favorites.events.length === 0
            ? <EmptyState icon={Calendar} title={t('favorites.noEvents')} description={t('favorites.noEventsText')} actionHref="/events" actionLabel={t('favorites.browseEvents')} />
            : <div className="events">{favorites.events.map((event, i) => <EventCard key={event.id} event={event} index={i} isFavoritedInitial onFavoriteToggle={onEventToggle} />)}</div>
        ) : (
          favorites.venues.length === 0
            ? <EmptyState icon={MapPin} title={t('favorites.noVenues')} description={t('favorites.noVenuesText')} actionHref="/venues" actionLabel={t('favorites.browseVenues')} />
            : <div className="venues">{favorites.venues.map((venue, i) => <VenueCard key={venue.id} venue={venue} index={i} isFavoritedInitial />)}</div>
        )}
      </div>
    </main>
  );
}
