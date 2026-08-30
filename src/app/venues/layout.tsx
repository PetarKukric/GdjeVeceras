import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lokali',
  description: 'Klubovi, barovi, kafane i restorani — Pronađi. Izaberi. Izađi. Svi lokali na jednom mjestu.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
