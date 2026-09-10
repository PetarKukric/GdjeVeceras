'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, ChevronRight, Clock } from 'lucide-react';
import { Venue } from '@/types';
import { getVenueStatus } from '@/lib/venue-utils';
interface VenueCardProps { venue: Venue; isFavoritedInitial?: boolean; onFavoriteToggle?: (venueId:string, favorited:boolean)=>void; }
export function VenueCard({venue}:VenueCardProps) {
 const [status,setStatus]=useState<ReturnType<typeof getVenueStatus>|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{const update=()=>setStatus(getVenueStatus(venue.openingHours || [])); update(); const timer=setInterval(update,60000); return ()=>clearInterval(timer);},[venue.openingHours]);
 return <Link href={`/venues/${venue.slug}`} className="venue-card">
 <div className="venue-card__image">{venue.imageUrl && !failed ? <img src={venue.imageUrl} alt="" loading="lazy" onError={()=>setFailed(true)}/> : <MapPin size={26}/>}</div>
 <div className="min-w-0"><h3>{venue.name}</h3><p className="text-sm text-muted mt-1">{venue.city}</p>
 {status && status.status!=='UNKNOWN' && <div className="mt-2 text-xs"><p className={status.status==='OPEN'?'text-green-400':'text-muted'}><Clock size={13} className="inline mr-1"/>{status.label}</p>{status.subLabel && <p className="text-muted mt-1">{status.subLabel}</p>}</div>}
 </div><ChevronRight size={18} className="text-muted shrink-0"/>
 </Link>;
}
