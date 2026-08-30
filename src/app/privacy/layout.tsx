import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politika privatnosti',
  description: 'Kako Gdje Večeras sakuplja i štiti vaše podatke.',
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
