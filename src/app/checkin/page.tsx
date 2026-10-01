import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { CheckInClient } from '@/components/score/CheckInClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('checkin.metaTitle'), robots: { index: false } };
}

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ v?: string; k?: string }> }) {
  const params = await searchParams;
  const session = await getSession();
  return (
    <CheckInClient
      loggedIn={Boolean(session)}
      qrVenue={typeof params.v === 'string' ? params.v : ''}
      qrCode={typeof params.k === 'string' ? params.k : ''}
    />
  );
}
