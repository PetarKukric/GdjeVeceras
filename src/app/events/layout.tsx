import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Događaji',
  description: 'Žurke, koncerti i izlasci večeras i ovog vikenda — Banja Luka, Gradiška, Prnjavor, Srbac.',
  alternates: { canonical: '/events' },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
