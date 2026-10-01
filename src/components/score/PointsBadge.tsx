'use client';

import { Rocket, Zap } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { CHECKIN_RULES, isBoosted, venuePoints } from '@/lib/score';

/** Bedž "+10 / +30 / +50" na karticama: pink za partner i boostovane lokale */
export function PointsBadge({ venue }: { venue?: { isPartner?: boolean | null; boostedUntil?: string | Date | null } | null }) {
  const { t } = useLang();
  if (!venue) return null;
  const pts = venuePoints(venue);
  const boosted = isBoosted(venue);
  const special = pts > CHECKIN_RULES.basePoints;
  return (
    <span className={`pts${special ? '' : ' pts--none'}`} title={boosted ? t('score.boosted') : venue.isPartner ? t('score.partnerVenue') : t('score.checkinHere')}>
      {boosted ? <Rocket className="ic" aria-hidden="true" /> : <Zap className="ic" aria-hidden="true" />}+{pts}
    </span>
  );
}
