import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { cache } from 'react';

/**
 * Jedinstveni naslov + opis + LocalBusiness JSON-LD za svaki lokal.
 * (Layout je server komponenta iako je sama stranica klijentska.)
 */

type Params = { params: Promise<{ slug: string }> };

const DAY_MAP: Record<string, string[]> = {
  WEEKDAYS: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  MONDAY: ['Monday'],
  TUESDAY: ['Tuesday'],
  WEDNESDAY: ['Wednesday'],
  THURSDAY: ['Thursday'],
  FRIDAY: ['Friday'],
  SATURDAY: ['Saturday'],
  SUNDAY: ['Sunday'],
};

const getVenue = cache(async (slug: string) => {
  try {
    return await prisma.venue.findUnique({
      where: { slug },
      include: { openingHours: true },
    });
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) return { title: 'Lokal nije pronađen' };

  const desc =
    (venue.description || '').slice(0, 155) ||
    `${venue.name} u ${venue.city} — adresa, radno vrijeme, događaji i rezervacije na Gdje Večeras.`;

  return {
    title: `${venue.name} — ${venue.city}`,
    description: desc,
    openGraph: {
      title: `${venue.name} — ${venue.city}`,
      description: desc,
      images: venue.imageUrl ? [{ url: venue.imageUrl }] : undefined,
    },
  };
}

export default async function VenueSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
} & Params) {
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue) return <>{children}</>;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    url: `${baseUrl}/venues/${venue.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: venue.address,
      addressLocality: venue.city,
      addressCountry: 'BA',
    },
  };
  if (venue.description) jsonLd.description = venue.description;
  if (venue.imageUrl) jsonLd.image = venue.imageUrl;
  if (venue.phone) jsonLd.telephone = venue.phone;
  if (venue.latitude != null && venue.longitude != null) {
    jsonLd.geo = { '@type': 'GeoCoordinates', latitude: venue.latitude, longitude: venue.longitude };
  }
  const sameAs = [venue.website, venue.instagramUrl, venue.facebookUrl, venue.tiktokUrl].filter(Boolean);
  if (sameAs.length > 0) jsonLd.sameAs = sameAs;

  const hours = venue.openingHours
    .filter((h) => !h.isClosed && h.openTime && h.closeTime && DAY_MAP[h.dayGroup])
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_MAP[h.dayGroup],
      opens: h.openTime,
      closes: h.closeTime,
    }));
  if (hours.length > 0) jsonLd.openingHoursSpecification = hours;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {children}
    </>
  );
}
