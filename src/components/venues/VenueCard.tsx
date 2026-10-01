'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Zap } from 'lucide-react';
import { Venue } from '@/types';
import { getVenueStatus } from '@/lib/venue-utils';
import { initials } from '@/lib/score';
import { useLang } from '@/components/i18n/LangProvider';

interface VenueCardProps { venue: Venue; isFavoritedInitial?: boolean; onFavoriteToggle?: (venueId: string, favorited: boolean) => void; index?: number }

export function VenueCard({ venue, index = 0 }: VenueCardProps) {
  const { t } = useLang();
  const [status, setStatus] = useState<ReturnType<typeof getVenueStatus> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const update = () => setStatus(getVenueStatus(venue.openingHours || []));
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [venue.openingHours]);

  return (
    <Link href={`/venues/${venue.slug}`} className={`vcard${venue.isPartner ? ' vcard--partner' : ''}`} style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
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
      {venue.isPartner
        ? <span className="pts" title={t('score.checkinHere')}><Zap className="ic" aria-hidden="true" />+{venue.checkInPoints ?? 100}</span>
        : <ChevronRight size={18} className="text-muted shrink-0" aria-hidden="true" />}
    </Link>
  );
}
