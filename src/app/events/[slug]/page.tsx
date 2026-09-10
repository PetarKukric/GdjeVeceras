import { notFound } from 'next/navigation';
import { EventPageClient } from '@/components/events/EventPageClient';
import { getPublicEventDetails } from '@/lib/public-event-data';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type EventPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
};

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const session = await getSession();
  const data = await getPublicEventDetails(slug, query.date, session?.user.id);
  if (!data) notFound();

  return <EventPageClient slug={slug} initialData={JSON.parse(JSON.stringify(data))} />;
}
