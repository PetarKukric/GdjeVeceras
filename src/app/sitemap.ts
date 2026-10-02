import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

// Lokali i događaji se mijenjaju — sitemap se osvježava svakih sat vremena
export const revalidate = 3600;

/**
 * Javne stranice + svaki lokal i svaki aktuelni događaj (gosti i Google ih vide bez naloga).
 * Lične stranice (profil, sačuvano, poruke...) traže prijavu i nisu ovdje.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  const now = new Date();
  const routes: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'daily' },
    { path: '/events', priority: 0.9, changeFrequency: 'daily' },
    { path: '/venues', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/rewards', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/leaderboard', priority: 0.5, changeFrequency: 'daily' },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.2, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
  ];
  const pages: MetadataRoute.Sitemap = routes.map((r) => ({ url: `${baseUrl}${r.path}`, lastModified: now, changeFrequency: r.changeFrequency, priority: r.priority }));

  try {
    const [venues, events] = await Promise.all([
      prisma.venue.findMany({ select: { slug: true, updatedAt: true } }),
      // Budući događaji i ponavljajući koji još traju
      prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { endDateTime: { gte: now } },
            { isRecurring: true, OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: now } }] },
          ],
        },
        select: { slug: true, updatedAt: true },
        take: 2000,
      }),
    ]);
    for (const v of venues) pages.push({ url: `${baseUrl}/venues/${v.slug}`, lastModified: v.updatedAt, changeFrequency: 'weekly', priority: 0.7 });
    for (const e of events) pages.push({ url: `${baseUrl}/events/${e.slug}`, lastModified: e.updatedAt, changeFrequency: 'daily', priority: 0.8 });
  } catch (error) {
    // Baza nedostupna (npr. pri buildu) — vrati bar statične stranice
    console.error('Sitemap DB error:', error);
  }
  return pages;
}
