'use client';

import React from 'react';
import Link from 'next/link';
import { Flame, Gift, Martini, QrCode, Receipt, Rocket, Shirt, Star, Ticket, Zap } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { CHECKIN_RULES, TIERS, tierInfo } from '@/lib/score';
import type { LeaderboardRow } from '@/lib/score-service';
import { Avatar } from '@/components/ui/Avatar';

export interface ScoreSummary {
  points: number;
  totalPoints: number;
  checkIns: number;
  venues: number;
  streak: number;
}

/** Velika score kartica: bodovi, nivo, napredak, statistika */
export function ScoreCard({ score, cta = true }: { score: ScoreSummary; cta?: boolean }) {
  const { t, fmt } = useLang();
  const tier = tierInfo(score.totalPoints);
  return (
    <div className="score__card">
      <p className="kicker">{t('score.name')}</p>
      <div className="score__num"><Zap className="ic" aria-hidden="true" /><span>{fmt(score.points)}</span></div>
      <p className="score__sub">{t('score.balanceNote', { total: fmt(score.totalPoints) })}</p>
      <div className="tier">
        <div className="tier__row">
          <span className="tier__badge">{t(`tiers.${tier.current.key}.name`)}</span>
          <span className="tier__next">
            {tier.next
              ? <>{t('score.toNext', { n: fmt(tier.toNext) })} <b>{t(`tiers.${tier.next.key}.name`)}</b></>
              : t('score.maxTier')}
          </span>
        </div>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tier.progress * 100)} aria-label={t('score.progress')}>
          <span style={{ transform: `scaleX(${Math.max(0.04, tier.progress)})` }} />
        </div>
      </div>
      <ul className="stats">
        <li><b>{fmt(score.checkIns)}</b><span>{t('score.statCheckins')}</span></li>
        <li><b>{fmt(score.venues)}</b><span>{t('score.statVenues')}</span></li>
        <li><b><Flame className="ic" aria-hidden="true" />{score.streak}</b><span>{t('score.statStreak')}</span></li>
      </ul>
      {cta && <Link href="/checkin" className="btn btn--pink btn--block"><QrCode className="ic" aria-hidden="true" />{t('score.checkinNow')}</Link>}
    </div>
  );
}

export function TierLadder({ totalPoints }: { totalPoints: number | null }) {
  const { t, fmt } = useLang();
  const current = totalPoints === null ? -1 : tierInfo(totalPoints).index;
  return (
    <div className="tiers" aria-label={t('score.tiersAria')}>
      {TIERS.map((tier, i) => (
        <div key={tier.key} className={`tiers__item${i === current ? ' is-current' : ''}${i < current ? ' is-done' : ''}`}>
          <span className="tiers__lvl">0{i + 1}</span>
          {i === current && <span className="tiers__here">{t('score.youAreHere')}</span>}
          <b>{t(`tiers.${tier.key}.name`)}</b>
          <small>{t('score.pointsShort', { n: fmt(tier.min) })}</small>
          <p>{t(`tiers.${tier.key}.perk`)}</p>
        </div>
      ))}
    </div>
  );
}

export function RewardKindIcon({ kind }: { kind: string }) {
  const Icon = kind === 'DRINK' ? Martini : kind === 'ENTRY' ? Ticket : kind === 'MERCH' ? Shirt : Gift;
  return <span className="reward__kind" aria-hidden="true"><Icon className="ic" /></span>;
}

export function Board({ rows, me, emptyText }: { rows: LeaderboardRow[]; me?: LeaderboardRow | null; emptyText?: string }) {
  const { t, fmt } = useLang();
  if (!rows.length && !me) return <div className="empty"><b>{t('board.emptyTitle')}</b>{emptyText || t('board.empty')}</div>;
  const showMe = me && !rows.some((r) => r.isMe);
  const Row = ({ r, i }: { r: LeaderboardRow; i: number }) => (
    <li className={`row${r.rank <= 3 && r.rank > 0 ? ` row--${r.rank}` : ''}${r.isMe ? ' row--me' : ''}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
      <span className="row__rank">{r.rank > 0 ? r.rank : '–'}</span>
      <Avatar name={r.name} url={r.avatarUrl} className="row__av" />
      <span className="row__name">
        <Link href={`/u/${r.userId}`}><b>{r.name}{r.isMe && <span className="row__you"> · {t('board.you')}</span>}</b></Link>
        <small>{r.lastVenue ? t('board.last', { venue: r.lastVenue }) : t('board.checkins', { n: r.checkIns })}</small>
      </span>
      <span className="row__score"><Zap className="ic" aria-hidden="true" />{fmt(r.points)}</span>
    </li>
  );
  return (
    <ol className="board">
      {rows.map((r, i) => <Row key={r.userId} r={r} i={i} />)}
      {showMe && <>{rows.length > 0 && <li className="board__gap" aria-hidden="true">···</li>}<Row r={me!} i={rows.length} /></>}
    </ol>
  );
}

/** Pravila bodovanja (jedini izvor istine je CHECKIN_RULES) — koristi se na početnoj i "Kako radi" */
export function PointsRules() {
  const { t } = useLang();
  const r = CHECKIN_RULES;
  const rows = [
    { Icon: QrCode, title: t('rules.any'), text: t('rules.anyText', { h: r.cooldownHours }), pts: `+${r.basePoints}` },
    { Icon: Star, title: t('rules.partner'), text: t('rules.partnerText'), pts: `+${r.basePoints + r.partnerBonus}` },
    { Icon: Rocket, title: t('rules.boost'), text: t('rules.boostText'), pts: `+${r.basePoints + r.boostBonus}` },
    { Icon: Flame, title: t('rules.streak'), text: t('rules.streakText', { n: r.streakStartWeekends, x: r.streakStartMultiplier, step: r.streakStep, every: r.streakStepWeekends }), pts: `×${r.streakStartMultiplier}+` },
    { Icon: Receipt, title: t('rules.receipt'), text: t('rules.receiptText'), pts: t('rules.receiptPts') },
  ];
  return (
    <>
      {rows.map(({ Icon, title, text, pts }) => (
        <li key={title}><span className="how__ic"><Icon className="ic" aria-hidden="true" /></span><div><b>{title}</b><p>{text}</p></div><span className="how__pts">{pts}</span></li>
      ))}
    </>
  );
}
