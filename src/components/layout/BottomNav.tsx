'use client';
import React from 'react';
import { Home, Search, Bookmark, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function BottomNav() {
 const pathname=usePathname();
 if(pathname?.startsWith('/admin')) return null;
 const items=[['Početna','/',Home],['Događaji','/events',Search],['Lokali','/venues',MapPin],['Sačuvano','/favorites',Bookmark],['Rezervacije','/reservations',Clock]] as const;
 return <nav className="mobile-nav" aria-label="Glavna navigacija"><div className="mobile-nav__items">{items.map(([label,href,Icon])=>{const active=href==='/'?pathname==='/':pathname?.startsWith(href);return <Link key={href} href={href} aria-current={active?'page':undefined} className={active?'text-primary':'text-muted'}><Icon size={22}/><span>{label}</span></Link>;})}</div></nav>;
}
