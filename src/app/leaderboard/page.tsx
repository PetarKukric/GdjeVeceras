import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getT } from '@/lib/i18n/server';
import { SUPPORTED_CITIES, getCityBySlug } from '@/lib/cities';
import { getLeaderboard, type LeaderboardPeriod, type LeaderboardScope } from '@/lib/score-service';
import { Board } from '@/components/score/ScoreParts';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('board.metaTitle'), description: t('board.lead') };
}

type Params = { period?: string; scope?: string; city?: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const period: LeaderboardPeriod = params.period === 'all' ? 'all' : 'week';
  const scope: LeaderboardScope = params.scope === 'friends' ? 'friends' : 'city';
  const city = getCityBySlug(params.city)?.slug || '';
  const session = await getSession();
  const { t } = await getT();

  let data: Awaited<ReturnType<typeof getLeaderboard>> = { rows: [], me: null };
  try {
    data = await getLeaderboard({ period, scope, city, viewerId: session?.user.id });
  } catch (error) {
    console.error('Leaderboard error:', error);
  }

  const href = (next: Partial<Params>) => {
    const qs = new URLSearchParams();
    const merged = { period, scope, city, ...next };
    if (merged.period !== 'week') qs.set('period', merged.period!);
    if (merged.scope !== 'city') qs.set('scope', merged.scope!);
    if (merged.city) qs.set('city', merged.city);
    const s = qs.toString();
    return s ? `/leaderboard?${s}` : '/leaderboard';
  };

  return (
    <main className="page">
      <div className="wrap lb-grid">
        <div>
          <p className="kicker">{t('board.kicker')}</p>
          <h1 className="h1">{t('board.title')}</h1>
          <p className="lead">{period === 'week' ? t('board.lead') : t('board.leadAll')}</p>

          <nav className="seg" aria-label={t('board.periodAria')}>
            <Link className="seg__btn" href={href({ period: 'week' })} aria-current={period === 'week' ? 'true' : undefined}>{t('board.week')}</Link>
            <Link className="seg__btn" href={href({ period: 'all' })} aria-current={period === 'all' ? 'true' : undefined}>{t('board.allTime')}</Link>
          </nav>
          <nav className="seg" aria-label={t('board.scopeAria')}>
            <Link className="seg__btn" href={href({ scope: 'city' })} aria-current={scope === 'city' ? 'true' : undefined}>{t('board.everyone')}</Link>
            <Link className="seg__btn" href={href({ scope: 'friends' })} aria-current={scope === 'friends' ? 'true' : undefined}>{t('board.friends')}</Link>
          </nav>

          <div className="chips" style={{ marginTop: 20, flexWrap: 'wrap' }} aria-label={t('home.city')}>
            <Link className={`chip${!city ? ' is-on' : ''}`} href={href({ city: '' })}>{t('home.allCities')}</Link>
            {SUPPORTED_CITIES.map((c) => (
              <Link key={c.slug} className={`chip${city === c.slug ? ' is-on' : ''}`} href={href({ city: c.slug })}>{c.name}</Link>
            ))}
          </div>

          {!session && (
            <div className="panel" style={{ marginTop: 8 }}>
              <p style={{ margin: 0, color: 'var(--muted)' }}>{t('board.guest')}</p>
              <Link className="btn btn--pink btn--block" style={{ marginTop: 14 }} href="/signup?next=/leaderboard">{t('nav.signup')}</Link>
            </div>
          )}
        </div>

        <div>
          {scope === 'friends' && !session
            ? <div className="empty"><b>{t('board.friendsLoginTitle')}</b>{t('board.friendsLogin')}</div>
            : <Board rows={data.rows} me={data.me} emptyText={scope === 'friends' ? t('board.friendsEmpty') : undefined} />}
        </div>
      </div>
    </main>
  );
}
