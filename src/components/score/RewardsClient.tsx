'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Crown, Loader2, Zap } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { SCORE_EVENT } from '@/components/layout/Header';
import { RewardKindIcon } from '@/components/score/ScoreParts';
import { PosterArt } from '@/components/ui/PosterArt';
import { Avatar } from '@/components/ui/Avatar';
import { rewardIssuer } from '@/lib/reward-labels';
import { signupUrl } from '@/lib/guest';

export interface RewardItem {
  id: string; title: string; titleEn: string | null; description: string | null; descriptionEn: string | null;
  kind: string; cost: number; imageUrl: string | null; stock: number | null;
  type: string; topRank: number | null; provider: string | null;
  venue: { name: string; slug: string; city: string } | null;
}
export interface Standing { rank: number; userId: string; points: number; name: string; avatarUrl: string | null }
export interface MyCode {
  id: string; code: string; status: string; createdAt: string; usedAt: string | null;
  reward: { title: string; titleEn: string | null; provider?: string | null; type?: string; venue: { name: string } | null };
}

const FILTERS = ['ALL', 'MERCH', 'DRINK', 'ENTRY'] as const;

export function RewardsClient({ rewards: allRewards, codes: initialCodes, initialBalance, loggedIn, standings, meId }: { rewards: RewardItem[]; codes: MyCode[]; initialBalance: number | null; loggedIn: boolean; standings: Standing[]; meId: string | null }) {
  const { t, fmt, lang } = useLang();
  const [balance, setBalance] = useState(initialBalance ?? 0);
  const [codes, setCodes] = useState(initialCodes);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);

  const rewards = useMemo(() => allRewards.filter((r) => r.type === 'REDEEM'), [allRewards]);
  const topPrizes = useMemo(() => allRewards.filter((r) => r.type === 'TOP').sort((a, b) => (a.topRank || 0) - (b.topRank || 0)), [allRewards]);
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
        reward: { title: reward.title, titleEn: reward.titleEn, provider: reward.provider, venue: reward.venue ? { name: reward.venue.name } : null },
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

      <section className="top5" aria-labelledby="top5-title">
        <div className="top5__head">
          <div>
            <p className="kicker"><Crown size={13} aria-hidden="true" style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />{t('rewards.topKicker')}</p>
            <h2 className="h3" id="top5-title">{t('rewards.topTitle')}</h2>
            <p className="ci-note" style={{ textAlign: 'left', margin: '6px 0 0' }}>{t('rewards.topLead')}</p>
          </div>
        </div>
        <ol className="top5__list">
          {[1, 2, 3, 4, 5].map((rank) => {
            const prize = topPrizes.find((p) => p.topRank === rank);
            const who = standings.find((s) => s.rank === rank);
            return (
              <li key={rank} className={`top5__row${rank === 1 ? ' is-first' : ''}${who?.userId === meId ? ' is-me' : ''}`}>
                <span className="top5__rank">{rank}</span>
                <span className="top5__prize">
                  <b>{prize ? title(prize) : t('rewards.topNoPrize')}</b>
                  <small>{prize ? rewardIssuer(prize) : '—'}</small>
                </span>
                <span className="top5__who">
                  {who ? <><Avatar name={who.name} url={who.avatarUrl} className="row__av" /><span><b>{who.name}{who.userId === meId ? ` · ${t('board.you')}` : ''}</b><small>{fmt(who.points)} {t('score.ptsAbbr')}</small></span></> : <small>{t('rewards.topOpen')}</small>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <h2 className="h3" style={{ margin: '36px 0 14px' }}>{t('rewards.redeemTitle')}</h2>
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
                <span>{r.venue ? `${r.venue.name} · ${r.venue.city}` : rewardIssuer(r)}</span>
                {desc && <p>{desc}</p>}
                <div className="rcard__foot">
                  <div>
                    <em>{fmt(r.cost)}<small>{t('score.ptsAbbr')}</small></em>
                    {r.stock !== null && <div className="rcard__stock">{soldOut ? t('rewards.soldOut') : t('rewards.stock', { n: r.stock })}</div>}
                  </div>
                  {!loggedIn ? (
                    <Link className="btn btn--pink btn--sm" href={signupUrl('rewards', '/rewards')}>{t('rewards.redeem')}</Link>
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
                    <small> · {rewardIssuer(c.reward)}{c.reward.type === 'TOP' ? ` · ${t('rewards.topBadge')}` : ''} · {t(`rewards.status.${c.status}`)}</small>
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
