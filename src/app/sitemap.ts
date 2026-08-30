import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.vercel.app';

  // Statika
  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/events', priority: 0.9 },
    { path: '/venues', priority: 0.9 },
    { path: '/about', priority: 0.5 },
    { path: '/contact', priority: 0.5 },
    { path: '/how-it-works', priority: 0.5 },
    { path: '/faq', priority: 0.6 },
    { path: '/terms', priority: 0.3 },
    { path: '/privacy', priority: 0.3 },
  ].map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: r.priority,
  }));

  // Događaji i lokali iz baze (samo objavljeni događaji)
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [events, venues] = await Promise.all([
      prisma.event.findMany({
        where: { status: 'PUBLISHED', endDateTime: { gte: new Date() } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.venue.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    dynamicRoutes = [
      ...events.map((e) => ({
        url: `${baseUrl}/events/${e.slug}`,
        lastModified: e.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
      ...venues.map((v) => ({
        url: `${baseUrl}/venues/${v.slug}`,
        lastModified: v.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // Baza nije dostupna pri build-u — preskoči dinamičke rute
  }

  return [...staticRoutes, ...dynamicRoutes];
}
