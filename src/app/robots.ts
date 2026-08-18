import type { MetadataRoute } from 'next';

// ⚠️ PRED-LANSIRANJE: blokiraj Google indeksiranje dok sajt nije zvanično
// pokrenut. Na dan lansiranja (1. septembar) obriši disallow '/*' red
// (ili zatraži novu verziju) da bi Google počeo da indeksira sajt.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdje-veceras.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        disallow: ['/*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
