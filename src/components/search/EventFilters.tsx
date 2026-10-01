'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, MapPin, X } from 'lucide-react';
import { Category } from '@/types';
import { SUPPORTED_CITIES } from '@/lib/cities';
import { useLang } from '@/components/i18n/LangProvider';
import debounce from 'lodash.debounce';

interface FilterState {
  search: string;
  category: Category | 'ALL';
  date: string;
  priceRange: string;
  venue: string;
  city: string;
  sort: string;
}

interface EventFiltersProps {
  initialFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  venues: { id: string, name: string, slug: string }[];
}

const DEFAULT_FILTERS: FilterState = {
  search: '', category: 'ALL', date: 'all', priceRange: 'ALL', venue: '', city: '', sort: 'startTime',
};

export function EventFilters({ initialFilters, onFilterChange, venues }: EventFiltersProps) {
  const { t } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search);

  // Sync with initial filters if they change externally (e.g. back button)
  useEffect(() => {
    setFilters((prev) => (JSON.stringify(prev) !== JSON.stringify(initialFilters) ? initialFilters : prev));
    setSearchTerm(initialFilters.search);
  }, [initialFilters]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => { onFilterChange({ ...filters, search: val }); }, 500),
    [filters, onFilterChange]
  );
  useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    debouncedSearch(val);
  };

  const updateFilter = (key: keyof FilterState, value: string | Category) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm('');
    onFilterChange(DEFAULT_FILTERS);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.date !== 'all') count++;
    if (filters.priceRange !== 'ALL') count++;
    if (filters.venue !== '') count++;
    if (filters.sort !== 'startTime') count++;
    return count;
  }, [filters]);

  const dates = [['all', t('filters.anytime')], ['today', t('home.when.today')], ['tomorrow', t('home.when.tomorrow')], ['weekend', t('home.when.weekend')]] as const;
  const prices = [['ALL', t('filters.anyPrice')], ['0-0', t('filters.free')], ['0-10', t('filters.upTo', { n: 10 })], ['10-20', '10–20 KM'], ['20-1000', '20+ KM']] as const;
  const sorts = ['startTime', 'popularity', 'relevance', 'price', 'newest', 'distance'] as const;
  const label: React.CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 10px' };

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search" style={{ flex: '1 1 420px', boxShadow: 'none' }}>
          <label className="search__field">
            <Search className="ic" aria-hidden="true" />
            <span className="sr-only">{t('home.searchLabel')}</span>
            <input type="search" placeholder={t('home.searchPlaceholder')} value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
          </label>
          <label className="search__city">
            <MapPin className="ic" aria-hidden="true" />
            <span className="sr-only">{t('home.city')}</span>
            <select value={filters.city} onChange={(e) => updateFilter('city', e.target.value)}>
              <option value="">{t('home.allCities')}</option>
              {SUPPORTED_CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} className={`btn ${isOpen || activeFilterCount > 0 ? 'btn--pink' : 'btn--ghost'}`}>
          <SlidersHorizontal className="ic" aria-hidden="true" />
          {t('filters.more')}
          {activeFilterCount > 0 && <span className="tier__badge" style={{ padding: '2px 8px' }}>{activeFilterCount}</span>}
        </button>
      </div>

      <div className="chips" style={{ marginTop: 16, marginBottom: 0 }} role="group" aria-label={t('home.filterAria')}>
        {(['ALL', 'PARTY', 'LIVE_MUSIC', 'CONCERT'] as const).map((value) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.category === value} onClick={() => updateFilter('category', value)}>
            {value === 'ALL' ? t('common.all') : t(`categories.${value}`)}
          </button>
        ))}
        {dates.slice(1).map(([value, text]) => (
          <button key={value} type="button" className="chip" aria-pressed={filters.date === value} onClick={() => updateFilter('date', filters.date === value ? 'all' : value)}>{text}</button>
        ))}
      </div>

      {isOpen && (
        <div className="panel" style={{ marginTop: 16, animation: 'pop .25s var(--ease) both' }}>
          <div className="panel__title">
            <span>{t('filters.advanced')}</span>
            <button type="button" onClick={resetFilters} className="link" style={{ minHeight: 32 }}><X size={14} aria-hidden="true" />{t('filters.reset')}</button>
          </div>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div>
              <p style={label}>{t('filters.date')}</p>
              <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
                {dates.map(([value, text]) => <button key={value} type="button" className="chip" aria-pressed={filters.date === value} onClick={() => updateFilter('date', value)}>{text}</button>)}
              </div>
              <input type="date" className="input" aria-label={t('filters.pickDate')} value={filters.date.match(/^\d{4}-\d{2}-\d{2}$/) ? filters.date : ''} onChange={(e) => updateFilter('date', e.target.value)} />
            </div>
            <div>
              <p style={label}>{t('filters.price')}</p>
              <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 0 }}>
                {prices.map(([value, text]) => <button key={value} type="button" className="chip" aria-pressed={filters.priceRange === value} onClick={() => updateFilter('priceRange', value)}>{text}</button>)}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <label className="field">
                <span>{t('filters.sort')}</span>
                <select className="input" value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                  {sorts.map((s) => <option key={s} value={s}>{t(`filters.sorts.${s}`)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t('filters.venue')}</span>
                <select className="input" value={filters.venue} onChange={(e) => updateFilter('venue', e.target.value)}>
                  <option value="">{t('filters.allVenues')}</option>
                  {venues.map((v) => <option key={v.id} value={v.slug}>{v.name}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
