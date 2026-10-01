'use client';

import Link from 'next/link';
import { QrCode, Receipt } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

/** Traka na stranici lokala: koliko bodova donosi check-in (+ bonus za račun ako ga lokal ima) */
export function PartnerCheckInBanner({ points, partner, receipt }: { points: number; partner: boolean; receipt?: { min: number; bonus: number } | null }) {
  const { t } = useLang();
  return (
    <div className={`venue-cta${partner ? '' : ' venue-cta--plain'}`} style={{ marginTop: 0 }}>
      <div>
        <h2 className="h3">{partner ? t('partners.bannerTitle', { n: points }) : t('partners.bannerTitlePlain', { n: points })}</h2>
        <p>{t('partners.bannerText')}</p>
        {receipt && <p className="venue-cta__receipt"><Receipt size={16} aria-hidden="true" />{t('partners.receiptBanner', { min: receipt.min, n: receipt.bonus })}</p>}
      </div>
      <Link className="btn btn--white" href="/checkin"><QrCode className="ic" aria-hidden="true" />{t('nav.checkin')}</Link>
    </div>
  );
}
