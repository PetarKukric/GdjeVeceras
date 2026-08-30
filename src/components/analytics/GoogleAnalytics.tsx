'use client';

import Script from 'next/script';

/**
 * Google Analytics 4 — uključuje se SAMO ako postoji NEXT_PUBLIC_GA_ID.
 * Postavi Measurement ID (G-XXXXXXX) u Vercel → Environment Variables →
 * NEXT_PUBLIC_GA_ID, pa redeploy. Bez tog broja se ništa ne učitava.
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId || !/^G-[A-Z0-9]+$/i.test(gaId)) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
