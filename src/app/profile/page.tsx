import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Gift, Heart, MessageSquare, QrCode, Settings, Trophy, Share2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { loadFeed, loadProfile, loadSuggestions } from '@/lib/profile-data';
import { ScoreCard, TierLadder } from '@/components/score/ScoreParts';
import { Feed, PersonRow, type FeedEntry } from '@/components/score/SocialParts';
import { PhotoGallery, ProfileIdentity, type ProfilePhoto } from '@/components/score/ProfileParts';
import { LogoutButton } from '@/components/score/LogoutButton';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('nav.profile'), robots: { index: false } };
}

const serialize = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/signup?reason=profile&next=/profile');
  const { t } = await getT();

  const [profile, feed, suggestions] = await Promise.all([
    loadProfile(session.user.id, session.user.id),
    loadFeed(session.user.id).catch(() => []),
    loadSuggestions(session.user.id).catch(() => []),
  ]);
  if (!profile) redirect('/login');
  const { user, score, checkIns, photos } = profile;

  return (
    <main className="page">
      <div className="wrap profile">
        <aside className="profile__side">
          <ProfileIdentity
            editable
            user={{ id: user.id, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl, showCheckIns: user.showCheckIns }}
            since={t('profile.since', { year: user.createdAt.getFullYear() })}
            counts={<>
              <span><b>{user._count.followers}</b> {t('social.followers')}</span>
              <span><b>{user._count.following}</b> {t('social.followingCount')}</span>
            </>}
          />
          <ScoreCard score={score} />
          <div className="quick">
            <Link href="/checkin"><QrCode className="ic" aria-hidden="true" />{t('nav.checkin')}</Link>
            <Link href="/rewards"><Gift className="ic" aria-hidden="true" />{t('nav.rewards')}</Link>
            <Link href="/leaderboard"><Trophy className="ic" aria-hidden="true" />{t('nav.leaderboard')}</Link>
            <Link href={`/u/${user.id}`}><Share2 className="ic" aria-hidden="true" />{t('profile.public')}</Link>
            <Link href="/favorites"><Heart className="ic" aria-hidden="true" />{t('nav.saved')}</Link>
            <Link href="/chat"><MessageSquare className="ic" aria-hidden="true" />{t('nav.messages')}</Link>
            <Link href="/settings"><Settings className="ic" aria-hidden="true" />{t('nav.settings')}</Link>
          </div>
          <LogoutButton />
        </aside>

        <div className="profile__main">
          <section className="panel">
            <p className="panel__title">{t('profile.photos')} <span className="pg__count">{photos.length}</span></p>
            <PhotoGallery initial={serialize(photos) as unknown as ProfilePhoto[]} editable ownerName={user.name || ''} />
          </section>

          <section className="panel">
            <p className="panel__title">
              <span>{t('profile.myCheckins')}{!user.showCheckIns && <span className="pill-private">{t('profile.hidden')}</span>}</span>
              <Link className="link" href="/checkin">{t('score.checkinNow')}</Link>
            </p>
            <Feed items={serialize(checkIns) as unknown as FeedEntry[]} emptyText={t('profile.noCheckins')} showUser={false} owner={{ name: user.name, avatarUrl: user.avatarUrl }} />
          </section>

          <section className="panel">
            <p className="panel__title">{t('profile.feed')}</p>
            <Feed items={serialize(feed) as unknown as FeedEntry[]} emptyText={t('profile.feedEmpty')} />
          </section>

          {suggestions.length > 0 && (
            <section className="panel">
              <p className="panel__title">{t('profile.suggestions')}</p>
              <div className="people">
                {suggestions.map((p) => <PersonRow key={p.id} person={p} following={false} />)}
              </div>
            </section>
          )}

          <section>
            <p className="kicker">{t('profile.levels')}</p>
            <TierLadder totalPoints={score.totalPoints} />
          </section>
        </div>
      </div>
    </main>
  );
}
