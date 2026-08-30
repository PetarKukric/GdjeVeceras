import type { Metadata } from 'next';

// Lična/auth stranica — ne indeksuje se
export const metadata: Metadata = {
  title: 'Potvrda emaila',
  description: 'Potvrdite vašu email adresu.',
  robots: { index: false, follow: false },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
