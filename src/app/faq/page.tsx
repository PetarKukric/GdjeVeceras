import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { getT } from '@/lib/i18n/server';
import { FAQ } from '@/lib/i18n/pages';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('info.faqTitle'), description: t('info.faqLead') };
}

export default async function FaqPage() {
  const { t, lang } = await getT();
  const groups = FAQ[lang];
  // FAQPage strukturirani podaci — Google može prikazati odgovore direktno u pretrazi
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) => g.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }))),
  };

  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{t('info.helpKicker')}</p>
            <h1 className="h1">{t('info.faqTitle')}</h1>
            <p className="lead">{t('info.faqLead')}</p>
          </div>
        </div>

        <nav className="chips" aria-label={t('info.toc')}>
          {groups.map((g) => <a key={g.id} className="chip" href={`#${g.id}`}>{g.title}</a>)}
        </nav>

        <div className="faq">
          {groups.map((g) => (
            <section key={g.id} id={g.id} className="faq__group">
              <h2 className="dsec__title">{g.title}</h2>
              <div className="faq__list">
                {g.items.map((item) => (
                  <details key={item.q} className="faq__item">
                    <summary><span>{item.q}</span><ChevronDown className="ic" aria-hidden="true" /></summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="venue-cta">
          <div>
            <h2 className="h3"><MessageCircle className="ic" aria-hidden="true" />{t('info.faqMore')}</h2>
            <p>{t('info.faqMoreText')}</p>
          </div>
          <Link className="btn btn--white" href="/contact">{t('info.contactUs')}</Link>
        </div>
      </div>
    </main>
  );
}
