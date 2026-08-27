import React from 'react';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-card rounded-md ${className}`} />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-card border border-white/5 rounded-3xl overflow-hidden shadow-xl">
      <Skeleton className="aspect-[16/10] w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-4 w-1/4 bg-primary/20" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function VenueCardSkeleton() {
  return (
    <div className="bg-card border border-white/5 rounded-3xl overflow-hidden shadow-xl">
      <Skeleton className="aspect-[1.8/1] w-full" />
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="pt-4 border-t border-white/5 flex justify-between items-center">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
