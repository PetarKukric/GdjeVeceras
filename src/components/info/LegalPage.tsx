import Link from 'next/link';
import { Mail } from 'lucide-react';
import type { LegalSection } from '@/lib/i18n/pages';
import { CONTACT_EMAIL } from '@/lib/i18n/pages';

/** Pravni tekst: lijevo sadržaj (sidra), desno sekcije. Serverska komponenta. */
export function LegalPage({ kicker, title, updated, sections, contactLabel, tocLabel, related }: {
  kicker: string; title: string; updated: string; sections: LegalSection[];
  contactLabel: string; tocLabel: string; related: { href: string; label: string };
}) {
  return (
    <main className="page">
      <div className="wrap">
        <div className="page-head">
          <div>
            <p className="kicker">{kicker}</p>
            <h1 className="h1">{title}</h1>
            <p className="lead">{updated}</p>
          </div>
        </div>
        <div className="legal">
          <nav className="legal__toc" aria-label={tocLabel}>
            <p className="panel__title">{tocLabel}</p>
            <ol>
              {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`}><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</a></li>)}
            </ol>
            <Link className="link" href={related.href}>{related.label} →</Link>
          </nav>
          <div className="legal__body">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="legal__sec">
                <h2><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
                {s.body.map((block, j) => Array.isArray(block)
                  ? <ul key={j}>{block.map((li) => <li key={li}>{li}</li>)}</ul>
                  : <p key={j}>{block}</p>)}
              </section>
            ))}
            <a className="legal__contact" href={`mailto:${CONTACT_EMAIL}`}>
              <span className="how__ic"><Mail className="ic" aria-hidden="true" /></span>
              <span><small>{contactLabel}</small><b>{CONTACT_EMAIL}</b></span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
