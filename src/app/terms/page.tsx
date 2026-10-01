import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { LEGAL, LEGAL_UPDATED } from '@/lib/i18n/pages';
import { LegalPage } from '@/components/info/LegalPage';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('info.termsTitle'), description: t('info.termsDesc') };
}

export default async function TermsPage() {
  const { t, lang } = await getT();
  return (
    <LegalPage
      kicker={t('info.legalKicker')}
      title={t('info.termsTitle')}
      updated={t('info.updated', { date: LEGAL_UPDATED[lang] })}
      sections={LEGAL.terms[lang]}
      tocLabel={t('info.toc')}
      contactLabel={t('info.termsContact')}
      related={{ href: '/privacy', label: t('footer.privacy') }}
    />
  );
}
