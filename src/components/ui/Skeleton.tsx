import React from 'react';
export function Skeleton({className}:{className?:string}) { return <div aria-hidden="true" className={`animate-pulse bg-surface rounded-md ${className || ''}`}/>; }
export function EventCardSkeleton() { return <div role="status" aria-label="Učitavanje događaja" className="bg-card border border-border rounded-2xl p-4 flex gap-3"><Skeleton className="w-20 h-24 shrink-0"/><div className="flex-1 space-y-3"><Skeleton className="h-5 w-3/4"/><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-2/3"/></div></div>; }
export function VenueCardSkeleton() { return <EventCardSkeleton/>; }
