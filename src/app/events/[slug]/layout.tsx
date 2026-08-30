import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { cache } from 'react';

/**
 * Jedinstveni naslov + opis + Event JSON-LD za svaki događaj.
 * (Layout je server komponenta iako je sama stranica klijentska.)
 */

type Params = { params: Promise<{ slug: string }> };

const getEvent = cache(async (slug: string) => {
  try {
    return await prisma.event.findUnique({
      where: { slug },
      include: { venue: { select: { name: true, slug: true, address: true, city: true } } },
    });
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return { title: 'Događaj nije pronađen' };

  const desc =
    (event.description || '').slice(0, 155) ||
    `${event.title} u ${event.venue?.name || 'lokalu'}, ${event.venue?.city || ''} — ${new Date(event.startDateTime).toLocaleDateString('bs')} Datum, cijena i rezervacije na Gdje Večeras.`;

  return {
    title: `${event.title} — ${event.venue?.name || ''}`,
    description: desc,
    openGraph: {
      title: `${event.title} — ${event.venue?.name || ''}`,
      description: desc,
      images: event.imageUrl ? [{ url: event.imageUrl }] : undefined,
    },
  };
}

export default async function EventSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
} & Params) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return <>{children}</>;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startDateTime.toISOString(),
    endDate: event.endDateTime.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: `${baseUrl}/events/${event.slug}`,
    location: {
      '@type': 'Place',
      name: event.venue?.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.venue?.address,
        addressLocality: event.venue?.city,
        addressCountry: 'BA',
      },
    },
  };
  if (event.description) jsonLd.description = event.description;
  if (event.imageUrl) jsonLd.image = event.imageUrl;
  if (event.price != null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: event.price,
      priceCurrency: 'BAM',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/events/${event.slug}`,
    };
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {children}
    </>
  );
}
