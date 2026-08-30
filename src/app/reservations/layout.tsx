import type { Metadata } from 'next';

// Lična/auth stranica — ne indeksuje se
export const metadata: Metadata = {
  title: 'Moje rezervacije',
  description: 'Pregled vaših rezervacija.',
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
