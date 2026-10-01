import type { MetadataRoute } from 'next';

/**
 * Aplikacija je iza prijave — Google indeksira samo javne stranice (prijava, registracija, FAQ, kako radi, kontakt, pravni tekstovi).
 * Zaključano: admin, API i lične stranice (chat, podešavanja, reset lozinke...).
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
          '/chat',
          '/settings',
          '/favorites',
          '/profile',
          '/rewards',
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
