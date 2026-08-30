import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'O nama',
  description: 'Gdje Večeras — platforma za noćni život u Bosni i Hercegovini. Naša priča i misija.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
