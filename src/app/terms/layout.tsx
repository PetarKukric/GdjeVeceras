import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uslovi korištenja',
  description: 'Uslovi korištenja platforme Gdje Večeras.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
