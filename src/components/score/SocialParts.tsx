'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { tierInfo } from '@/lib/score';
import { Avatar } from '@/components/ui/Avatar';
import { goSignup } from '@/lib/guest';

export function FollowButton({ userId, initial, small = false }: { userId: string; initial: boolean; small?: boolean }) {
  const { t } = useLang();
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
      if (res.status === 401) { goSignup('follow'); return; }
      if (res.ok) setFollowing((await res.json()).following);
    } finally {
      setBusy(false);
    }
  };
  const Icon = busy ? Loader2 : following ? UserCheck : UserPlus;
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={following} className={`btn ${following ? 'btn--ghost' : 'btn--pink'}${small ? ' btn--sm' : ''}`}>
      <Icon className={`ic${busy ? ' animate-spin' : ''}`} aria-hidden="true" />{following ? t('social.following') : t('social.follow')}
    </button>
  );
}

export interface FeedEntry {
  id: string; points: number; photoUrl: string | null; createdAt: string;
  user?: { id: string; name: string | null; avatarUrl?: string | null };
  venue: { name: string; slug: string };
  event: { title: string } | null;
}

export function TimeAgo({ iso }: { iso: string }) {
  const { lang } = useLang();
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang === 'en' ? 'en' : 'sr-Latn', { numeric: 'auto' });
  const abs = Math.abs(diff);
  const text = abs < 3600 ? rtf.format(Math.round(diff / 60), 'minute')
    : abs < 86400 ? rtf.format(Math.round(diff / 3600), 'hour')
    : rtf.format(Math.round(diff / 86400), 'day');
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}

export function Feed({ items, emptyText, showUser = true, owner }: { items: FeedEntry[]; emptyText: string; showUser?: boolean; owner?: { name: string | null; avatarUrl: string | null } }) {
  const { t } = useLang();
  if (!items.length) return <p className="ci-note" style={{ margin: 0, textAlign: 'left' }}>{emptyText}</p>;
  return (
    <ul className="feed">
      {items.map((c, i) => (
        <li key={c.id} className="feed__item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <Avatar name={c.user?.name || owner?.name} url={c.user?.avatarUrl ?? owner?.avatarUrl} className="row__av" />
          <p className="feed__text" style={{ margin: 0 }}>
            {showUser && c.user ? <><Link href={`/u/${c.user.id}`}>{c.user.name}</Link> </> : null}
            {t('social.checkedIn')} <Link href={`/venues/${c.venue.slug}`}>{c.venue.name}</Link>
            {c.event ? <> · {c.event.title}</> : null}
            <small><TimeAgo iso={c.createdAt} /></small>
          </p>
          <span className="feed__pts">+{c.points}</span>
          {c.photoUrl && <div className="feed__photo"><img src={c.photoUrl} alt={t('social.photoAt', { venue: c.venue.name })} loading="lazy" /></div>}
        </li>
      ))}
    </ul>
  );
}

export function PersonRow({ person, following }: { person: { id: string; name: string | null; totalPoints: number; avatarUrl?: string | null }; following: boolean }) {
  const { t, fmt } = useLang();
  return (
    <div className="person">
      <Avatar name={person.name} url={person.avatarUrl} className="row__av" />
      <div className="person__name">
        <Link href={`/u/${person.id}`}><b>{person.name}</b></Link>
        <small>{t(`tiers.${tierInfo(person.totalPoints).current.key}.name`)} · {fmt(person.totalPoints)}</small>
      </div>
      <FollowButton userId={person.id} initial={following} small />
    </div>
  );
}
