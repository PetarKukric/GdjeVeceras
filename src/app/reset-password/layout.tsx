import type { Metadata } from 'next';

// Lična/auth stranica — ne indeksuje se
export const metadata: Metadata = {
  title: 'Nova lozinka',
  description: 'Postavite novu lozinku.',
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
