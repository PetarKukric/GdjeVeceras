'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, Calendar, Tag, DollarSign, MapPin, X } from 'lucide-react';
import { Category } from '@/types';
import { SUPPORTED_CITIES } from '@/lib/cities';
import debounce from 'lodash.debounce';

interface FilterState {
  search: string;
  category: Category | 'ALL';
  date: string;
  priceRange: string;
  venue: string;
  city: string;
  sort: string;
  reservations: 'available' | '';
}

interface EventFiltersProps {
  initialFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  venues: { id: string, name: string, slug: string }[];
}

export function EventFilters({ initialFilters, onFilterChange, venues }: EventFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search);

  // Sync with initial filters if they change externally (e.g. back button)
  useEffect(() => {
    setFilters((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(initialFilters)) {
        return initialFilters;
      }
      return prev;
    });
    setSearchTerm(initialFilters.search);
  }, [initialFilters]);

  const debouncedSearch = useMemo(
    () => debounce((val: string) => {
      onFilterChange({ ...filters, search: val });
    }, 500),
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
    const defaultFilters: FilterState = {
      search: '',
      category: 'ALL',
      date: 'all',
      priceRange: 'ALL',
      venue: '',
      city: '',
      sort: 'startTime',
      reservations: '',
    };
    setFilters(defaultFilters);
    setSearchTerm('');
    onFilterChange(defaultFilters);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'ALL') count++;
    if (filters.date !== 'all') count++;
    if (filters.priceRange !== 'ALL') count++;
    if (filters.venue !== '') count++;
    if (filters.city !== '') count++;
    if (filters.sort !== 'startTime') count++;
    if (filters.reservations === 'available') count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-3 min-w-0">
      <div className="city-picker"><MapPin size={18}/><select aria-label="Grad" value={filters.city} onChange={e=>updateFilter('city',e.target.value)}><option value="">Svi gradovi</option>{SUPPORTED_CITIES.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Kategorija događaja">{([['ALL','Sve'],['PARTY','Žurke'],['LIVE_MUSIC','Muzika uživo'],['CONCERT','Koncerti']] as const).map(([value,label])=><button key={value} onClick={()=>updateFilter('category',value)} aria-pressed={filters.category===value} className={`min-h-11 px-3 rounded-xl border border-border shrink-0 text-sm ${filters.category===value?'bg-primary text-white':'bg-card text-muted'}`}>{label}</button>)}</div>
      <div className="flex gap-2">
        <div className="relative flex-grow min-w-0 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Traži žurke, izvođače ili lokale..."
            className="w-full h-12 pl-12 pr-4 bg-card/50 border border-white/5 rounded-2xl focus:outline-none focus:border-primary transition-all  text-sm"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-6 h-12 rounded-2xl border flex items-center gap-2 font-bold transition-all  ${isOpen || activeFilterCount > 0 ? 'bg-primary border-primary text-text' : 'bg-card/50 border-white/5 text-muted hover:text-text hover:bg-white/10'}`}
        >
          <SlidersHorizontal size={20} />
          <span className="hidden sm:inline uppercase">Filteri</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-text text-primary flex items-center justify-center text-[10px] font-black">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="bg-card/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-primary" /> Napredna pretraga
            </h3>
            <button onClick={resetFilters} className="text-xs font-bold text-muted hover:text-red-400 transition-colors flex items-center gap-1">
              <X size={14} /> RESETUJ SVE
            </button>
          </div>

          <div className="mb-6 relative z-10">
            <button
              type="button"
              onClick={() => updateFilter('reservations', filters.reservations === 'available' ? '' : 'available')}
              aria-pressed={filters.reservations === 'available'}
              className={`rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest ${filters.reservations === 'available' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted'}`}
            >
              Samo događaji koji primaju rezervacije
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <Tag size={12} className="text-primary" /> Kategorija
              </label>
              <div className="flex flex-col gap-2">
                {(['ALL', 'LIVE_MUSIC', 'CONCERT', 'PARTY'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateFilter('category', cat)}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filters.category === cat ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-muted hover:border-border/80 hover:text-text'}`}
                  >
                    {cat === 'ALL' ? 'SVE' : cat === 'LIVE_MUSIC' ? 'MUZIKA UŽIVO' : cat === 'CONCERT' ? 'KONCERT' : 'ŽURKA'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar size={12} className="text-primary" /> Datum
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'BILO KADA', value: 'all' },
                  { label: 'DANAS', value: 'today' },
                  { label: 'SUTRA', value: 'tomorrow' },
                  { label: 'OVAJ VIKEND', value: 'weekend' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => updateFilter('date', d.value)}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filters.date === d.value ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-muted hover:border-border/80 hover:text-text'}`}
                  >
                    {d.label}
                  </button>
                ))}
                <input
                  type="date"
                  className="bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-muted focus:outline-none focus:border-primary"
                  value={filters.date.match(/^\d{4}-\d{2}-\d{2}$/) ? filters.date : ''}
                  onChange={(e) => updateFilter('date', e.target.value)}
                />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                <DollarSign size={12} className="text-primary" /> Cijena
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'SVE CIJENE', value: 'ALL' },
                  { label: 'CIJENA NIJE NAVEDENA / 0 KM', value: '0-0' },
                  { label: 'DO 10 KM', value: '0-10' },
                  { label: '10 - 20 KM', value: '10-20' },
                  { label: '20+ KM', value: '20-1000' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => updateFilter('priceRange', p.value)}
                    className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${filters.priceRange === p.value ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-muted hover:border-border/80 hover:text-text'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Venue */}
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <SlidersHorizontal size={12} className="text-primary" /> Sortiraj po
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-muted focus:outline-none focus:border-primary"
                  value={filters.sort}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                >
                  <option value="startTime">Najskorije</option>
                  <option value="popularity">Najpopularnije</option>
                  <option value="relevance">Najrelevantnije</option>
                  <option value="price">Najjeftinije</option>
                  <option value="newest">Najnovije dodato</option>
                  <option value="distance">Najbliže meni</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin size={12} className="text-primary" /> Grad
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-muted focus:outline-none focus:border-primary"
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                >
                  <option value="">Svi gradovi</option>
                  {SUPPORTED_CITIES.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin size={12} className="text-primary" /> Lokal
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-bold text-muted focus:outline-none focus:border-primary"
                  value={filters.venue}
                  onChange={(e) => updateFilter('venue', e.target.value)}
                >
                  <option value="">Svi lokali</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.slug}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
