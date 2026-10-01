import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kako funkcioniše',
  description: 'Kako radi Gdje Večeras: pronađi izlazak, čekiraj se u klub (10 bodova, 30 u partner lokalima), skupljaj niz vikenda i uzmi nagrade.',
  alternates: { canonical: '/how-it-works' },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
