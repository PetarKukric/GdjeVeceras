import type { MetadataRoute } from 'next';

/**
 * Google indeksira javni dio: početnu, događaje, lokale, nagrade, rang listu i info stranice.
 * Zaključano: admin, API i lične stranice (profil, sačuvano, poruke, podešavanja, reset lozinke...).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/settings',
          '/favorites',
          '/profile',
          '/checkin',
          '/u/',
          '/thank-you',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
