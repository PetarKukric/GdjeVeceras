import Link from 'next/link';
import { ArrowRight, Gift, QrCode, Search, Trophy, Zap, Store, BarChart3, Ticket } from 'lucide-react';
import { getT } from '@/lib/i18n/server';
import { CHECKIN_RULES } from '@/lib/score';
import { PointsRules, TierLadder } from '@/components/score/ScoreParts';

export default async function HowItWorks() {
  const { t } = await getT();
  const steps = [
    { icon: Search, title: t('howPage.s1'), text: t('howPage.s1t') },
    { icon: QrCode, title: t('howPage.s2'), text: t('howPage.s2t') },
    { icon: Zap, title: t('howPage.s3'), text: t('howPage.s3t', { base: CHECKIN_RULES.basePoints, partner: CHECKIN_RULES.basePoints + CHECKIN_RULES.partnerBonus }) },
    { icon: Gift, title: t('howPage.s4'), text: t('howPage.s4t') },
  ];
  const venue = [
    { icon: QrCode, title: t('howPage.v1'), text: t('howPage.v1t') },
    { icon: Ticket, title: t('howPage.v2'), text: t('howPage.v2t') },
    { icon: BarChart3, title: t('howPage.v3'), text: t('howPage.v3t') },
  ];

  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{t('info.helpKicker')}</p>
            <h1 className="h1">{t('howPage.title1')} <span className="pink">{t('howPage.title2')}</span></h1>
            <p className="lead">{t('howPage.lead')}</p>
          </div>
        </div>

        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="steps__item" style={{ animationDelay: `${i * 70}ms` }}>
              <span className="steps__num">0{i + 1}</span>
              <span className="how__ic"><s.icon className="ic" aria-hidden="true" /></span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>

        <section className="section--tight">
          <div className="score" style={{ alignItems: 'center' }}>
            <div>
              <p className="kicker">{t('howPage.checkinKicker')}</p>
              <h2 className="h2">{t('howPage.checkinTitle')}</h2>
              <p className="lead">{t('howPage.checkinLead', { h: CHECKIN_RULES.cooldownHours })}</p>
            </div>
            <ol className="how" style={{ marginTop: 0 }}>
              <PointsRules />
            </ol>
          </div>
        </section>

        <section className="section--tight">
          <p className="kicker"><Trophy size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{t('profile.levels')}</p>
          <h2 className="h2">{t('howPage.levelsTitle')}</h2>
          <TierLadder totalPoints={null} />
        </section>

        <section className="section--tight">
          <p className="kicker"><Store size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{t('howPage.venueKicker')}</p>
          <h2 className="h2">{t('partners.ctaTitle')}</h2>
          <div className="steps steps--3">
            {venue.map((s) => (
              <div key={s.title} className="steps__item">
                <span className="how__ic"><s.icon className="ic" aria-hidden="true" /></span>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
            <Link className="btn btn--pink" href="/contact?topic=partner">{t('partners.ctaBtn')} <ArrowRight className="ic" aria-hidden="true" /></Link>
            <Link className="btn btn--ghost" href="/faq">{t('info.faqTitle')}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
