import type { MetadataRoute } from 'next';

/**
 * Samo stranice koje Google zaista može pročitati — ostatak sajta je iza prijave
 * (middleware preusmjerava na /login), pa ga nema smisla slati u sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  const routes: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/signup', priority: 1, changeFrequency: 'weekly' },
    { path: '/login', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  ];
  return routes.map((r) => ({ url: `${baseUrl}${r.path}`, lastModified: new Date(), changeFrequency: r.changeFrequency, priority: r.priority }));
}
