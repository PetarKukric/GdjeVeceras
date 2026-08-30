import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kako funkcioniše',
  description: 'Saznaj kako da pronađeš događaj, rezervišeš mjesto i dodaš svoj lokal na Gdje Večeras.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
