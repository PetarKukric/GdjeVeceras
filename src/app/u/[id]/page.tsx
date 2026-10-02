import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Flame, Lock, Zap } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { formatNumber } from '@/lib/i18n';
import { tierInfo } from '@/lib/score';
import { loadProfile } from '@/lib/profile-data';
import { Feed, FollowButton, type FeedEntry } from '@/components/score/SocialParts';
import { PhotoGallery, ProfileIdentity, type ProfilePhoto } from '@/components/score/ProfileParts';
import { TierLadder } from '@/components/score/ScoreParts';
import { signupUrl } from '@/lib/guest';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await loadProfile(id).catch(() => null);
  return { title: profile?.user.name || 'Profil', robots: { index: false } };
}

const serialize = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (session?.user.id === id) redirect('/profile');
  const { t, lang } = await getT();

  const profile = await loadProfile(id, session?.user.id).catch(() => null);
  if (!profile) notFound();
  const { user, score, checkIns, isFollowing, photos, checkInsVisible } = profile;
  const tier = tierInfo(score.totalPoints);

  return (
    <main className="page">
      <div className="wrap profile">
        <aside className="profile__side">
          <ProfileIdentity
            editable={false}
            user={{ id: user.id, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl, showCheckIns: user.showCheckIns }}
            since={t(`tiers.${tier.current.key}.name`)}
            counts={<>
              <span><b>{user._count.followers}</b> {t('social.followers')}</span>
              <span><b>{user._count.following}</b> {t('social.followingCount')}</span>
            </>}
          >
            <div style={{ marginTop: 18 }}>
              {session
                ? <FollowButton userId={user.id} initial={isFollowing} />
                : <a className="btn btn--pink" href={signupUrl('follow', `/u/${user.id}`)}>{t('social.follow')}</a>}
            </div>
          </ProfileIdentity>
          <ul className="stats">
            <li><b><Zap className="ic" aria-hidden="true" />{formatNumber(lang, score.totalPoints)}</b><span>{t('profile.totalScore')}</span></li>
            <li><b>{score.checkIns}</b><span>{t('score.statCheckins')}</span></li>
            <li><b><Flame className="ic" aria-hidden="true" />{score.streak}</b><span>{t('score.statStreak')}</span></li>
          </ul>
        </aside>
        <div className="profile__main">
          <section className="panel">
            <p className="panel__title">{t('profile.photos')} <span className="pg__count">{photos.length}</span></p>
            <PhotoGallery initial={serialize(photos) as unknown as ProfilePhoto[]} editable={false} ownerName={user.name || ''} />
          </section>
          <section className="panel">
            <p className="panel__title">{t('profile.recent')}</p>
            {checkInsVisible
              ? <Feed items={serialize(checkIns) as unknown as FeedEntry[]} emptyText={t('profile.noCheckinsOther')} showUser={false} owner={{ name: user.name, avatarUrl: user.avatarUrl }} />
              : <p className="ci-note" style={{ margin: 0, textAlign: 'left', display: 'flex', gap: 8, alignItems: 'center' }}><Lock size={16} aria-hidden="true" />{t('profile.checkinsPrivate', { name: user.name || '' })}</p>}
          </section>
          <section>
            <p className="kicker">{t('profile.levels')}</p>
            <TierLadder totalPoints={score.totalPoints} />
          </section>
        </div>
      </div>
    </main>
  );
}
