'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Map } from 'lucide-react';
interface HeroSearchProps {
 selectedCity: string; selectedDate: string;
 onCityChange: (city: string) => void; onDateChange: (date: string) => void;
 onSearch: (params: { search?: string; date?: string; category?: string }) => void;
 cities: { slug: string; name: string }[];
}
export function HeroSearch({selectedCity, selectedDate, onDateChange, onSearch}: HeroSearchProps) {
 const [query,setQuery]=useState('');
 return <div className="home-search">
 <form onSubmit={e=>{e.preventDefault();onSearch({search:query,date:selectedDate});}} className="flex gap-2">
 <label className="search-field"><Search size={18}/><input aria-label="Pretraži događaje" placeholder="Pretraži događaje..." value={query} onChange={e=>setQuery(e.target.value)}/><button type="submit" aria-label="Pretraži"><Search size={18}/></button></label>
 <Link className="map-button" aria-label="Prikaži mapu događaja" href={`/events?view=map&date=${selectedDate}${selectedCity ? '&city='+selectedCity : ''}`}><Map size={21}/></Link>
 </form>
 <div className="quick-dates" aria-label="Datum">{[['today','Večeras'],['tomorrow','Sutra'],['weekend','Vikend']].map(([value,label])=><button key={value} type="button" aria-pressed={selectedDate===value} onClick={()=>onDateChange(value)}>{label}</button>)}</div>
 </div>;
}
