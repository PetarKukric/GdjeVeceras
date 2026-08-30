import type { MetadataRoute } from 'next';

/**
 * Sajt je LANSIRAN — Google slobodno indeksira javne stranice.
 * Zaključano: admin, API i lične stranice (chat, podešavanja, reset lozinke...).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.vercel.app';
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
