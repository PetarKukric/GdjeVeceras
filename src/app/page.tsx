import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/HomeClient';
import { getInitialPublicEvents } from '@/lib/public-event-data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Događaji večeras i ovog vikenda',
  description: 'Pronađi događaje i lokale u svom gradu i pošalji zahtjev za rezervaciju stola.',
  alternates: { canonical: '/' },
};

type HomeProps = {
  searchParams: Promise<{ city?: string; date?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const city = params.city || '';
  const date = ['today', 'tomorrow', 'weekend'].includes(params.date || '') ? params.date! : 'today';
  let initialEvents: unknown[] = [];

  try {
    initialEvents = await getInitialPublicEvents(city, date);
  } catch (error) {
    console.error('Home SSR events error:', error);
  }

  return (
    <HomeClient
      explicitCity={params.city !== undefined}
      initialCity={city}
      initialDate={date}
      initialEvents={JSON.parse(JSON.stringify(initialEvents))}
    />
  );
}
