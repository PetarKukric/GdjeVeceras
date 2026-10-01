'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

import { Venue } from '@/types';
import { getVenueStatus } from '@/lib/venue-utils';
import { initials } from '@/lib/score';
import { PointsBadge } from '@/components/score/PointsBadge';

interface VenueCardProps { venue: Venue; isFavoritedInitial?: boolean; onFavoriteToggle?: (venueId: string, favorited: boolean) => void; index?: number }

export function VenueCard({ venue, index = 0 }: VenueCardProps) {
  const [status, setStatus] = useState<ReturnType<typeof getVenueStatus> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => setStatus(getVenueStatus(venue.openingHours || []));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [venue.openingHours]);

  return (
    <Link href={`/venues/${venue.slug}`} className={`vcard${venue.isPartner || venue.boostedUntil ? ' vcard--partner' : ''}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
      <div className="vcard__img">
        {venue.imageUrl && !failed
          ? <img src={venue.imageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
          : <span aria-hidden="true">{initials(venue.name)}</span>}
      </div>
      <div className="vcard__body">
        <b>{venue.name}</b>
        <span>{venue.city}</span>
        {status && status.status !== 'UNKNOWN' && (
          <p className={`vcard__status${status.status === 'OPEN' ? ' is-open' : ''}`}>{status.label}{status.subLabel ? <span> · {status.subLabel}</span> : null}</p>
        )}
      </div>
      <PointsBadge venue={venue} />
    </Link>
  );
}
