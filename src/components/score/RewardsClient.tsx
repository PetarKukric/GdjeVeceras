'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { SCORE_EVENT } from '@/components/layout/Header';
import { RewardKindIcon } from '@/components/score/ScoreParts';
import { PosterArt } from '@/components/ui/PosterArt';

export interface RewardItem {
  id: string; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null;
  kind: string; cost: number; imageUrl: string | null; stock: number | null;
  venue: { name: string; slug: string; city: string } | null;
}
export interface MyCode {
  id: string; code: string; status: string; createdAt: string; usedAt: string | null;
  reward: { title: string; titleEn: string | null; venue: { name: string } | null };
}

const FILTERS = ['ALL', 'MERCH', 'DRINK', 'ENTRY'] as const;

export function RewardsClient({ rewards, codes: initialCodes, initialBalance, loggedIn }: { rewards: RewardItem[]; codes: MyCode[]; initialBalance: number | null; loggedIn: boolean }) {
  const { t, fmt, lang } = useLang();
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [codes, setCodes] = useState(initialCodes);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);

  const visible = useMemo(() => rewards.filter((r) => filter === 'ALL' || r.kind === filter || (filter === 'DRINK' && r.kind === 'OTHER')), [rewards, filter]);
  const title = (r: { title: string; titleEn: string | null }) => (lang === 'en' && r.titleEn ? r.titleEn : r.title);

  const redeem = async (reward: RewardItem) => {
    if (!window.confirm(t('rewards.confirm', { title: title(reward), n: fmt(reward.cost) }))) return;
    setBusyId(reward.id);
    setError('');
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = `rewards.errors.${data.error}`;
        setError(t(key) === key ? t('rewards.errors.server') : t(key));
        return;
      }
      setBalance(data.balance);
      window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail: { balance: data.balance } }));
      setCodes((prev) => [{
        id: data.id, code: data.code, status: 'ACTIVE', createdAt: data.createdAt, usedAt: null,
        reward: { title: reward.title, titleEn: reward.titleEn, venue: reward.venue ? { name: reward.venue.name } : null },
      }, ...prev]);
      setFresh(data.code);
      document.getElementById('my-codes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      {loggedIn && (
        <div className="balance" style={{ width: 'fit-content', marginBottom: 24 }}>
          <Zap className="ic" aria-hidden="true" />
          <b>{fmt(balance)}</b>
          <span>{t('rewards.available')}</span>
        </div>
      )}

      <div className="chips" role="group" aria-label={t('rewards.filterAria')}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`rewards.filters.${f}`)}</button>
        ))}
      </div>

      {error && <div className="alert alert--error" role="alert" style={{ marginBottom: 20 }}><AlertCircle className="ic" aria-hidden="true" />{error}</div>}

      {visible.length === 0 ? <div className="empty"><b>{t('rewards.emptyTitle')}</b>{t('rewards.empty')}</div> : (
        <div className="rgrid">
          {visible.map((r) => {
            const soldOut = r.stock !== null && r.stock <= 0;
            const missing = r.cost - balance;
            const desc = lang === 'en' && r.descriptionEn ? r.descriptionEn : r.description;
            return (
              <article key={r.id} className="reward rcard">
                <div className="rcard__img">
                  {r.imageUrl ? <img src={r.imageUrl} alt="" loading="lazy" /> : <PosterArt seed={r.id} className="event__art" />}
                </div>
                <RewardKindIcon kind={r.kind} />
                <b>{title(r)}</b>
                <span>{r.venue ? `${r.venue.name} · ${r.venue.city}` : t('rewards.merch')}</span>
                {desc && <p>{desc}</p>}
                <div className="rcard__foot">
                  <div>
                    <em>{fmt(r.cost)}<small>{t('score.ptsAbbr')}</small></em>
                    {r.stock !== null && <div className="rcard__stock">{soldOut ? t('rewards.soldOut') : t('rewards.stock', { n: r.stock })}</div>}
                  </div>
                  {!loggedIn ? (
                    <Link className="btn btn--pink btn--sm" href="/login?next=/rewards">{t('rewards.redeem')}</Link>
                  ) : missing > 0 ? (
                    <span className="rcard__need">{t('rewards.missing', { n: fmt(missing) })}</span>
                  ) : (
                    <button className="btn btn--pink btn--sm" disabled={soldOut || busyId === r.id} onClick={() => redeem(r)}>
                      {busyId === r.id ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : null}{t('rewards.redeem')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {loggedIn && (
        <section className="panel" id="my-codes" style={{ marginTop: 40, scrollMarginTop: 90 }}>
          <p className="panel__title">{t('rewards.myCodes')}</p>
          {fresh && <div className="alert alert--ok" role="status" style={{ marginBottom: 14 }}>{t('rewards.freshCode', { code: fresh })}</div>}
          {codes.length === 0 ? <p className="ci-note" style={{ margin: 0 }}>{t('rewards.noCodes')}</p> : (
            <div className="codes">
              {codes.map((c) => (
                <div key={c.id} className={`code${c.status !== 'ACTIVE' ? ' code--used' : ''}`}>
                  <div>
                    <b>{title(c.reward)}</b>
                    <small> · {c.reward.venue?.name || t('rewards.merch')} · {t(`rewards.status.${c.status}`)}</small>
                  </div>
                  <span className="code__value">{c.code}</span>
                </div>
              ))}
            </div>
          )}
          <p className="ci-note" style={{ marginTop: 14, textAlign: 'left', marginInline: 0 }}>{t('rewards.howToUse')}</p>
        </section>
      )}
    </>
  );
}
