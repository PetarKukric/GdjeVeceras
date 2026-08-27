'use client';

import React, { useState } from 'react';
import { MapPin, Calendar, Music, Search } from 'lucide-react';

interface HeroSearchProps {
  selectedCity: string;
  onCityChange: (slug: string) => void;
  onSearch: (params: { search?: string; date?: string; category?: string }) => void;
  cities: { slug: string; name: string }[];
}

const DATE_OPTIONS = [
  { value: '', label: 'Izaberi datum' },
  { value: 'today', label: 'Danas' },
  { value: 'tomorrow', label: 'Sutra' },
  { value: 'weekend', label: 'Ovaj vikend' },
  { value: 'upcoming', label: 'Nadolazeći' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Svi događaji' },
  { value: 'PARTY', label: 'Žurke' },
  { value: 'LIVE_MUSIC', label: 'Muzika uživo' },
];

/**
 * Jedinstveni search sistem ispod heroa (po referenci):
 * [ Grad ] [ Datum ] [ Tip događaja ] [ PINK SEARCH ]
 * Desktop: jedan horizontalni bar; mobilni: naslagana kontrola (48px+).
 */
export function HeroSearch({ selectedCity, onCityChange, onSearch, cities }: HeroSearchProps) {
  const [date, setDate] = useState('');
  const [type, setType] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ date: date || undefined, category: type || undefined });
  };

  const fieldClass =
    'w-full h-12 md:h-14 bg-transparent border-0 focus:outline-none text-sm font-semibold text-white appearance-none cursor-pointer';
  const labelClass = 'block text-[10px] font-bold text-muted uppercase tracking-widest mb-1';

  return (
    <form
      onSubmit={submit}
      aria-label="Pretraga događaja"
      className="bg-elevated border border-border rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-2 md:pl-6 grid gap-3 md:gap-0 md:grid-cols-[1fr_1fr_1fr_auto] items-center"
    >
      <div className="md:pr-6 md:border-r md:border-border">
        <label htmlFor="hs-city" className={labelClass}>Grad</label>
        <div className="relative flex items-center">
          <MapPin size={16} className="text-primary mr-2 shrink-0" aria-hidden="true" />
          <select
            id="hs-city"
            aria-label="Izaberi grad"
            value={selectedCity}
            onChange={(e) => onCityChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">Svi gradovi</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="md:px-6 md:border-r md:border-border">
        <label htmlFor="hs-date" className={labelClass}>Datum</label>
        <div className="relative flex items-center">
          <Calendar size={16} className="text-primary mr-2 shrink-0" aria-hidden="true" />
          <select id="hs-date" aria-label="Izaberi datum" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass}>
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="md:px-6 md:border-r md:border-border">
        <label htmlFor="hs-type" className={labelClass}>Tip događaja</label>
        <div className="relative flex items-center">
          <Music size={16} className="text-primary mr-2 shrink-0" aria-hidden="true" />
          <select id="hs-type" aria-label="Izaberi tip događaja" value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        aria-label="Pretraži"
        className="h-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-primary text-white font-black flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-[0.97] transition-all shadow-lg shadow-primary/25 uppercase tracking-[0.2em] text-[10px] md:m-2"
      >
        <Search size={18} />
        <span className="md:hidden">Pretraži</span>
      </button>
    </form>
  );
}
