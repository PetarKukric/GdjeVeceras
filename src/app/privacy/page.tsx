import type { Metadata } from 'next';
import { getT } from '@/lib/i18n/server';
import { LEGAL, LEGAL_UPDATED } from '@/lib/i18n/pages';
import { LegalPage } from '@/components/info/LegalPage';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('info.privacyTitle'), description: t('info.privacyDesc'), alternates: { canonical: '/privacy' } };
}

export default async function PrivacyPage() {
  const { t, lang } = await getT();
  return (
    <LegalPage
      kicker={t('info.legalKicker')}
      title={t('info.privacyTitle')}
      updated={t('info.updated', { date: LEGAL_UPDATED[lang] })}
      sections={LEGAL.privacy[lang]}
      tocLabel={t('info.toc')}
      contactLabel={t('info.privacyContact')}
      related={{ href: '/terms', label: t('footer.terms') }}
    />
  );
}
