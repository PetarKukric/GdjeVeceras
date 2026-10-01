'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Search, Zap } from 'lucide-react';
import { VenueCard } from '@/components/venues/VenueCard';
import { useVenues } from '@/hooks/useVenues';
import { EmptyState } from '@/components/ui/EmptyState';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { readSavedCity, saveCity } from '@/lib/city-preference';
import { useLang } from '@/components/i18n/LangProvider';

function VenuesContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const citySlug = searchParams.get('city') || '';
  const venueType = searchParams.get('type') || '';
  const onlyPartners = searchParams.get('partners') === '1';

  const { data: venues, loading, error } = useVenues({ city: citySlug, type: venueType });
  const [favoriteVenueIds, setFavoriteVenueIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    if (key === 'city') { params.set('city', value); saveCity(value); }
    router.replace('/venues?' + params.toString(), { scroll: false });
  };

  const filteredVenues = (venues || []).filter((v) => {
    if (onlyPartners && !v.isPartner) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [v.name, v.city, v.address].filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  useEffect(() => {
    if (searchParams.has('city')) {
      saveCity(citySlug);
    } else {
      const saved = readSavedCity();
      if (saved) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('city', saved);
        router.replace(`/venues?${params.toString()}`, { scroll: false });
      }
    }

    async function fetchFavorites() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          const favRes = await fetch(`/api/favorites?userId=${session.user.id}`);
          if (favRes.ok) {
            const data = await favRes.json();
            setFavoriteVenueIds(data.venueIds || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    }
    fetchFavorites();
  }, [citySlug, router, searchParams]);

  const types = [['', t('common.all')], ['clubs', t('venuesPage.clubs')], ['bars', t('venuesPage.bars')]] as const;

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{t('venuesPage.kicker')}</p>
            <h1 className="h1">{t('venuesPage.title')}</h1>
            <p className="lead">{t('venuesPage.lead')}</p>
          </div>
        </div>

        <div className="search" style={{ boxShadow: 'none', maxWidth: 720 }}>
          <label className="search__field">
            <Search className="ic" aria-hidden="true" />
            <span className="sr-only">{t('venuesPage.searchLabel')}</span>
            <input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); updateFilter('search', e.target.value); }} placeholder={t('venuesPage.searchPlaceholder')} />
          </label>
          <label className="search__city">
            <MapPin className="ic" aria-hidden="true" />
            <span className="sr-only">{t('home.city')}</span>
            <select value={citySlug} onChange={(e) => updateFilter('city', e.target.value)}>
              <option value="">{t('home.allCities')}</option>
              {SUPPORTED_CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <div className="chips" style={{ marginTop: 16 }} role="group" aria-label={t('venuesPage.typeAria')}>
          {types.map(([value, label]) => (
            <button key={value} type="button" className="chip" aria-pressed={venueType === value} onClick={() => updateFilter('type', value)}>{label}</button>
          ))}
          <button type="button" className="chip" aria-pressed={onlyPartners} onClick={() => updateFilter('partners', onlyPartners ? '' : '1')}>
            <Zap size={14} aria-hidden="true" />&nbsp;{t('venuesPage.partners')}
          </button>
        </div>

        {loading ? (
          <div className="venues">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" style={{ minHeight: 104 }} />)}</div>
        ) : error ? (
          <div className="empty"><b>{t('venuesPage.loadError')}</b><button className="link" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>
        ) : filteredVenues.length === 0 ? (
          <EmptyState icon={MapPin} title={t('venuesPage.emptyTitle')} description={searchQuery ? t('venuesPage.emptySearch', { q: searchQuery }) : t('venuesPage.empty')} />
        ) : (
          <div className="venues">
            {filteredVenues.map((venue, index) => (
              <VenueCard key={venue.id} venue={venue} index={index} isFavoritedInitial={favoriteVenueIds.includes(venue.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VenuesContent />
    </Suspense>
  );
}
