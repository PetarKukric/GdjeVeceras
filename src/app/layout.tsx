import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { getSession } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com'),
  title: {
    default: "Gdje Večeras — Pronađi. Izaberi. Izađi.",
    template: "%s | Gdje Večeras",
  },
  description: "Žurke, koncerti i najbolji lokali u Banjoj Luci, Gradišci, Prnjavoru i Srpcu — sve na jednom mjestu. Pronađi. Izaberi. Izađi.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GdjeVečeras",
  },
  openGraph: {
    title: "Gdje Večeras — Pronađi. Izaberi. Izađi.",
    description: "Otkrijte najbolje žurke, koncerte i lokale u svom gradu.",
    type: "website",
    locale: "bs_BA",
    siteName: "Gdje Večeras",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Gdje Večeras" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF006E",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const user = session ? session.user : null;

  // JSON-LD: Organization + WebSite (Google razumije šta je sajt)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Gdje Večeras',
        url: baseUrl,
        logo: `${baseUrl}/logo-final.png`,
        sameAs: [
          'https://www.instagram.com/gdjeveceras',
          'https://www.tiktok.com/@gdjeveceras2',
          'https://www.facebook.com/share/1EaMwFTjic/',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'Gdje Večeras',
        inLanguage: 'bs',
        publisher: { '@id': `${baseUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang="bs" className={`${inter.variable} ${manrope.variable}`}>
      <body className="bg-background text-text min-h-screen antialiased flex flex-col relative overflow-x-clip">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
           <div className="absolute top-0 left-0 w-[45%] h-[45%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute bottom-0 right-0 w-[45%] h-[45%] bg-accent/5 blur-[120px] rounded-full" />
        </div>
        <ToastProvider>
          <Header initialUser={user} />
          {children}
        </ToastProvider>
        <ServiceWorkerRegister />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
