import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Pišite nam — odgovaramo u roku od 24 sata. Pitanja, sugestije i saradnja.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
