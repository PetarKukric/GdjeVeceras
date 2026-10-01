import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kako funkcioniše',
  description: 'Saznaj kako da pronađeš izlazak, čekiraš se u klub i skupljaš bodove na Gdje Večeras.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
