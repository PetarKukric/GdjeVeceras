import type { Metadata } from 'next';

// Javna stranica — Google je indeksira (ulaz u aplikaciju)
export const metadata: Metadata = {
  title: 'Prijava',
  description: 'Prijavi se na Gdje Večeras — svi izlasci u gradu, check-in u klubove i bodovi za piće, ulaze i merch.',
  alternates: { canonical: '/login' },
  openGraph: { title: 'Prijava — Gdje Večeras', description: 'Prijavi se na Gdje Večeras — svi izlasci u gradu, check-in u klubove i bodovi za piće, ulaze i merch.', images: [{ url: '/og.png', width: 1200, height: 630 }] },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
