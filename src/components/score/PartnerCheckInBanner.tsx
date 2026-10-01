'use client';

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

/** Traka na stranici partner lokala: "Ovdje skupljaš bodove — čekiraj se" */
export function PartnerCheckInBanner({ points }: { points: number }) {
  const { t } = useLang();
  return (
    <div className="venue-cta" style={{ marginTop: 0 }}>
      <div>
        <h2 className="h3">{t('partners.bannerTitle', { n: points })}</h2>
        <p>{t('partners.bannerText')}</p>
      </div>
      <Link className="btn btn--white" href="/checkin"><QrCode className="ic" aria-hidden="true" />{t('nav.checkin')}</Link>
    </div>
  );
}
