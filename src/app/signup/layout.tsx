import type { Metadata } from 'next';

// Javna stranica — Google je indeksira (ulaz u aplikaciju)
export const metadata: Metadata = {
  title: 'Napravi nalog',
  description: 'Besplatan nalog na Gdje Večeras: žurke i klubovi u tvom gradu, check-in i Večeras Score bodovi za nagrade.',
  alternates: { canonical: '/signup' },
  openGraph: { title: 'Napravi nalog — Gdje Večeras', description: 'Besplatan nalog na Gdje Večeras: žurke i klubovi u tvom gradu, check-in i Večeras Score bodovi za nagrade.', images: [{ url: '/og.png', width: 1200, height: 630 }] },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
