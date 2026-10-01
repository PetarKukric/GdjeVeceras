import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";
import "./gv.css";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { LangProvider } from "@/components/i18n/LangProvider";
import { getSession } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { htmlLang } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getT();
  return {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gdjeveceras.com'),
  title: {
    default: t('meta.title'),
    template: "%s | Gdje Večeras",
  },
  description: t('meta.description'),
  manifest: "/manifest.webmanifest",
  applicationName: "Gdje Večeras",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gdje Večeras",
  },
  openGraph: {
    title: t('meta.title'),
    description: t('meta.ogDescription'),
    type: "website",
    locale: lang === 'en' ? "en_GB" : "sr_BA",
    siteName: "Gdje Večeras",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Gdje Večeras" }],
  },
  };
}

export const viewport: Viewport = {
  themeColor: "#070708",
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
  const { lang, t } = await getT();

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
        logo: `${baseUrl}/logo.svg`,
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
        inLanguage: htmlLang(lang),
        publisher: { '@id': `${baseUrl}/#organization` },
      },
    ],
  };

  return (
    <html lang={htmlLang(lang)} className={`${manrope.variable} ${unbounded.variable}`}>
      <body className="bg-background text-text min-h-screen antialiased flex flex-col relative overflow-x-clip">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
        <a className="skip" href="#main">{t('common.skip')}</a>
        <div className="bg-fx" aria-hidden="true">
          <span className="bg-fx__img" />
          <span className="bg-fx__shade" />
          <span className="bg-fx__grain" />
        </div>
        <LangProvider initialLang={lang}>
          <ToastProvider>
            <Header initialUser={user} />
            <div id="main" className="flex-grow flex flex-col">{children}</div>
            <Footer />
            <BottomNav />
            <PageTransition />
          </ToastProvider>
        </LangProvider>
        <ServiceWorkerRegister />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
