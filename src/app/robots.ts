import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/chat', '/favorites', '/reservations', '/settings', '/login', '/signup', '/verify-email'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
