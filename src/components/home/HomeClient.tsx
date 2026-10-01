'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Flame, Gift, MapPin, Search, Trophy, Zap, Download } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { ClientOnly } from '@/components/ui/ClientOnly';
import { useLang } from '@/components/i18n/LangProvider';
import { Board, PointsRules, RewardKindIcon, ScoreCard, TierLadder, type ScoreSummary } from '@/components/score/ScoreParts';
import { useEvents } from '@/hooks/useEvents';
import { SUPPORTED_CITIES, getCityBySlug } from '@/lib/cities';
import { readSavedCity, saveCity } from '@/lib/city-preference';
import { CHECKIN_RULES, initials, isBoosted, tierInfo, venuePoints } from '@/lib/score';
import type { Category, Event, EventsResponse } from '@/types';
import type { LeaderboardRow } from '@/lib/score-service';

const EventMap = dynamic(() => import('@/components/map/EventMap'), {
  ssr: false,
  loading: () => <div className="skel" style={{ minHeight: 360 }} />,
});

export type HomeScore = ScoreSummary;
export interface HomePartner { id: string; name: string; slug: string; city: string; imageUrl: string | null; isPartner: boolean; boostedUntil: string | null; tags: string[] }
export interface HomeReward { id: string; title: string; titleEn: string | null; cost: number; kind: string; venue: { name: string } | null }

interface HomeClientProps {
  initialCity: string;
  explicitCity?: boolean;
  initialDate: string;
  initialEvents: unknown[];
  loggedIn: boolean;
  score: HomeScore | null;
  partners: HomePartner[];
  rewards: HomeReward[];
  board: LeaderboardRow[];
}

type DateKey = 'today' | 'tomorrow' | 'weekend';
const CATEGORIES: (Category | 'ALL')[] = ['ALL', 'PARTY', 'LIVE_MUSIC', 'CONCERT'];

interface InstallPromptEvent extends globalThis.Event { prompt: () => Promise<void> }

export function HomeClient({ initialCity, initialDate, initialEvents, explicitCity = false, loggedIn, score, partners, rewards, board }: HomeClientProps) {
  const router = useRouter();
  const { t, fmt, lang } = useLang();
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedDate, setSelectedDate] = useState<DateKey>(initialDate as DateKey);
  const [category, setCategory] = useState<Category | 'ALL'>('ALL');
  const [onlyPartners, setOnlyPartners] = useState(false);
  const [query, setQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);

  useEffect(() => {
    if (explicitCity) {
      setSelectedCity(initialCity);
      saveCity(initialCity);
    } else {
      const saved = readSavedCity();
      if (saved && SUPPORTED_CITIES.some((city) => city.slug === saved)) {
        setSelectedCity(saved);
        const params = new URLSearchParams(window.location.search);
        params.set('city', saved);
        router.replace(`/?${params.toString()}`, { scroll: false });
      }
    }
    setSelectedDate(initialDate as DateKey);
  }, [initialCity, initialDate, explicitCity, router]);

  useEffect(() => {
    if (!loggedIn) return;
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) return;
        const session = await sessionRes.json();
        const [favRes, recRes] = await Promise.all([
          fetch(`/api/favorites?userId=${session.user.id}`),
          fetch('/api/events/recommendations?limit=3'),
        ]);
        if (favRes.ok) setFavoriteIds((await favRes.json()).eventIds || []);
        if (recRes.ok) {
          const data = await recRes.json();
          setRecommendations((data.events || []).filter((e: Event) => !e.endDateTime || new Date(e.endDateTime) >= new Date()));
        }
      } catch (err) {
        console.error('Failed to fetch personal data', err);
      }
    })();
  }, [loggedIn]);

  useEffect(() => {
    const onPrompt = (e: globalThis.Event) => { e.preventDefault(); setInstallEvent(e as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const { data, loading, error } = useEvents({
    date: selectedDate,
    city: selectedCity,
    limit: 24,
    initialData: {
      events: initialEvents as Event[],
      pagination: { total: initialEvents.length, page: 1, limit: 24, totalPages: 1 },
    } as EventsResponse,
  });
  const { data: nextEventsData } = useEvents({ date: 'upcoming', city: selectedCity, limit: 3 });
  const { data: mapEventsData } = useEvents({ date: 'upcoming', limit: 60, sort: 'startTime', city: selectedCity });

  const events = useMemo(() => (data?.events || []).filter((e) => {
    if (onlyPartners && !e.venue?.isPartner) return false;
    if (category !== 'ALL' && e.category !== category) return false;
    return true;
  }), [data, onlyPartners, category]);

  const city = getCityBySlug(selectedCity);
  const cityName = city?.name || t('home.allCities');

  const updateUrl = (nextCity: string, nextDate: string) => {
    const params = new URLSearchParams();
    params.set('city', nextCity);
    if (nextDate && nextDate !== 'today') params.set('date', nextDate);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };
  const changeCity = (value: string) => { setSelectedCity(value); saveCity(value); updateUrl(value, selectedDate); };
  const changeDate = (value: DateKey) => { setSelectedDate(value); updateUrl(selectedCity, value); };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (query.trim()) qs.set('search', query.trim());
    if (selectedCity) qs.set('city', selectedCity);
    qs.set('date', query.trim() ? 'all' : selectedDate);
    router.push(`/events?${qs.toString()}`);
  };

  const install = async () => {
    if (installEvent) { await installEvent.prompt(); setInstallEvent(null); }
    else setInstallHint(true);
  };

  const whenLabel = t(`home.when.${selectedDate}`);
  const phoneTier = tierInfo(score?.totalPoints ?? 2480);
  const phoneEvents = (data?.events || []).slice(0, 2);
  const tickerItems = t('home.ticker').split('|');

  return (
    <main className="discovery-page">
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="wrap hero__grid">
          <div className="hero__copy">
            <p className="eyebrow">
              <span className="live-dot" aria-hidden="true" />
              <span>{t('home.eyebrow', { n: data?.events.length ?? 0, when: whenLabel.toLowerCase() })} · <b>{cityName}</b></span>
            </p>
            <h1 className="hero__title">{t('home.title1')} <em>{t('home.title2')}</em></h1>
            <p className="hero__lead">{t('home.lead1')} <strong>{t('score.name')}</strong> {t('home.lead2')}</p>

            <form className="search" role="search" onSubmit={submitSearch}>
              <label className="search__field">
                <Search className="ic" aria-hidden="true" />
                <span className="sr-only">{t('home.searchLabel')}</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('home.searchPlaceholder')} autoComplete="off" />
              </label>
              <label className="search__city">
                <MapPin className="ic" aria-hidden="true" />
                <span className="sr-only">{t('home.city')}</span>
                <select value={selectedCity} onChange={(e) => changeCity(e.target.value)}>
                  <option value="">{t('home.allCities')}</option>
                  {SUPPORTED_CITIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </label>
              <button className="btn btn--pink search__btn" type="submit"><Search className="ic" aria-hidden="true" /><span>{t('home.searchBtn')}</span></button>
            </form>

            <div className="when" role="group" aria-label={t('home.whenAria')}>
              {(['today', 'tomorrow', 'weekend'] as DateKey[]).map((key) => (
                <button key={key} type="button" className="when__chip" aria-pressed={selectedDate === key} onClick={() => changeDate(key)}>{t(`home.when.${key}`)}</button>
              ))}
            </div>
          </div>

          <div className="hero__phone" aria-hidden="true">
            <div className="phone">
              <div className="phone__notch" />
              <div className="phone__screen">
                <div className="ph-top">
                  <img src="/brand/logo-96.png" width="28" height="28" alt="" />
                  <span className="ph-pill"><Zap className="ic" />{fmt(score?.points ?? 2480)}</span>
                </div>
                <div className="ph-ring">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" className="ph-ring__bg" />
                    <circle cx="60" cy="60" r="52" className="ph-ring__fg" style={{ strokeDashoffset: 326.7 * (1 - phoneTier.progress) }} />
                  </svg>
                  <div className="ph-ring__label">
                    <small>Score</small>
                    <b>{fmt(score?.totalPoints ?? 2480)}</b>
                    <span>{t(`tiers.${phoneTier.current.key}.name`)}</span>
                  </div>
                </div>
                <div className="ph-streak"><Flame className="ic" />{t('home.phoneStreak', { n: score?.streak ?? 4 })}</div>
                {(phoneEvents.length ? phoneEvents : [null, null]).map((e, i) => (
                  <div className="ph-card" key={e?.id || i}>
                    <div className={`ph-card__poster${i ? ' ph-card__poster--w' : ''}`}>
                      {e?.imageUrl ? <img src={e.imageUrl} alt="" /> : <span>{i ? 'TECHNO' : 'HOUSE'}</span>}
                    </div>
                    <div>
                      <b>{e?.title || (i ? 'Warehouse Nights' : 'Pink Room Fridays')}</b>
                      <small>{e?.venue?.name || (i ? 'Silos 7' : 'Klub Neon')}</small>
                    </div>
                    <span className="ph-card__pts">+{e?.venue ? venuePoints(e.venue) : (i ? 30 : 10)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="float-badge float-badge--a"><Check className="ic" /> Check-in · {partners[0]?.name || 'Klub Neon'} <b>+{partners[0] ? venuePoints(partners[0]) : 30}</b></div>
            <div className="float-badge float-badge--b"><Trophy className="ic" /> {t('home.floatRank')}</div>
          </div>
        </div>

        <div className="ticker" aria-hidden="true">
          <div className="ticker__track">
            {[0, 1].map((n) => tickerItems.map((item) => <React.Fragment key={`${n}-${item}`}><span>{item}</span><i /></React.Fragment>))}
          </div>
        </div>
      </section>

      {/* ============ DOGAĐAJI ============ */}
      <section className="section" id="veceras" aria-live="polite">
        <div className="wrap">
          <div className="section__head">
            <div>
              <p className="kicker">{whenLabel} · {cityName}</p>
              <h2 className="h2">{t('home.eventsTitle')}</h2>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={onlyPartners} onChange={(e) => setOnlyPartners(e.target.checked)} />
              <span className="toggle__track"><span className="toggle__thumb" /></span>
              <span className="toggle__text"><Zap className="ic" aria-hidden="true" />{t('home.onlyPoints')}</span>
            </label>
          </div>

          <div className="chips" role="group" aria-label={t('home.filterAria')}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c === 'ALL' ? t('common.all') : t(`categories.${c}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="events">{[0, 1, 2].map((i) => <div key={i} className="skel" />)}</div>
          ) : error ? (
            <div className="empty"><b>{t('home.loadError')}</b><button className="link" onClick={() => window.location.reload()}>{t('common.retry')}</button></div>
          ) : events.length ? (
            <div className="events">
              {events.map((event, i) => (
                <EventCard key={`${event.id}-${event.occurrenceDate || ''}`} event={event} index={i} isFavoritedInitial={favoriteIds.includes(event.id)} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>{t('home.emptyTitle')}</b>
              <p>{t('home.emptyText')}</p>
              {(nextEventsData?.events.length || 0) > 0 && (
                <div className="events" style={{ marginTop: 24, textAlign: 'left' }}>
                  {nextEventsData!.events.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link className="btn btn--ghost" href={`/events?date=${selectedDate}${selectedCity ? `&city=${selectedCity}` : ''}`}>
              {t('home.allEvents')} <ArrowRight className="ic" aria-hidden="true" />
            </Link>
          </div>

          {recommendations.length > 0 && (
            <div style={{ marginTop: 'clamp(48px, 7vw, 80px)' }}>
              <div className="section__head">
                <div><p className="kicker">{t('home.forYouKicker')}</p><h2 className="h3">{t('home.forYou')}</h2></div>
              </div>
              <div className="events">
                {recommendations.map((event, i) => <EventCard key={event.id} event={event} index={i} isFavoritedInitial={favoriteIds.includes(event.id)} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ SCORE ============ */}
      <section className="section section--score" id="score">
        <div className="wrap">
          <div className="score">
            {score ? <ScoreCard score={score} /> : (
              <div className="score__card">
                <p className="kicker">{t('score.name')}</p>
                <div className="score__num"><Zap className="ic" aria-hidden="true" /><span>0</span></div>
                <p className="score__sub">{t('home.guestScore')}</p>
                <ul className="stats" style={{ marginTop: 24 }}>
                  <li><b>+{CHECKIN_RULES.basePoints}</b><span>{t('home.guestStatAny')}</span></li>
                  <li><b>+{CHECKIN_RULES.basePoints + CHECKIN_RULES.partnerBonus}</b><span>{t('home.guestStatPartner')}</span></li>
                  <li><b>×{CHECKIN_RULES.streakStartMultiplier}</b><span>{t('home.guestStatStreak')}</span></li>
                </ul>
                <Link href="/signup" className="btn btn--pink btn--block">{t('home.guestCta')}</Link>
              </div>
            )}

            <div>
              <p className="kicker">{t('home.howKicker')}</p>
              <h2 className="h2">{t('home.how1')} <span className="pink">{t('home.how2')}</span> {t('home.how3')}</h2>
              <p className="lead">{t('home.howLead')}</p>
              <ol className="how">
                <PointsRules />
              </ol>
            </div>
          </div>

          <TierLadder totalPoints={score ? score.totalPoints : null} />

          <div className="rewards">
            <div className="rewards__head">
              <h3 className="h3"><Gift className="ic" aria-hidden="true" />{t('home.spend')}</h3>
              <Link className="link" href="/rewards">{t('home.allRewards')} <ArrowRight className="ic" aria-hidden="true" /></Link>
            </div>
            {rewards.length ? (
              <div className="rewards__row">
                {rewards.map((r) => (
                  <Link key={r.id} href="/rewards" className="reward">
                    <RewardKindIcon kind={r.kind} />
                    <b>{lang === 'en' && r.titleEn ? r.titleEn : r.title}</b>
                    <span>{r.venue?.name || t('rewards.merch')}</span>
                    <em>{fmt(r.cost)}<small>{t('score.ptsAbbr')}</small></em>
                  </Link>
                ))}
              </div>
            ) : <div className="empty">{t('rewards.empty')}</div>}
          </div>
        </div>
      </section>

      {/* ============ RANG LISTA ============ */}
      <section className="section" id="rang">
        <div className="wrap lb-grid">
          <div>
            <p className="kicker">{t('board.kicker')}</p>
            <h2 className="h2">{t('board.title')}</h2>
            <p className="lead">{t('board.lead')}</p>
            <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="btn btn--white" href="/leaderboard">{t('board.full')} <ArrowRight className="ic" aria-hidden="true" /></Link>
              {loggedIn && <Link className="btn btn--ghost" href="/leaderboard?scope=friends">{t('board.friends')}</Link>}
            </div>
          </div>
          <Board rows={board} />
        </div>
      </section>

      {/* ============ PARTNERI ============ */}
      <section className="section section--score" id="partneri">
        <div className="wrap">
          <div className="section__head">
            <div>
              <p className="kicker">{t('partners.kicker')}</p>
              <h2 className="h2">{t('partners.title')}</h2>
            </div>
            <Link className="link" href="/venues">{t('partners.all')} <ArrowRight className="ic" aria-hidden="true" /></Link>
          </div>
          {partners.length ? (
            <div className="partners">
              {partners.map((p) => (
                <Link key={p.id} href={`/venues/${p.slug}`} className="partner">
                  <div className="partner__mark">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : initials(p.name)}</div>
                  <div className="partner__body"><b>{p.name}</b><span>{[p.city, ...p.tags].join(' · ')}</span></div>
                  <span className="partner__mult">+{venuePoints(p)}{isBoosted(p) ? ' 🚀' : ''}</span>
                </Link>
              ))}
            </div>
          ) : <div className="empty">{t('partners.empty')}</div>}

          <div className="venue-cta">
            <div>
              <h3 className="h3">{t('partners.ctaTitle')}</h3>
              <p>{t('partners.ctaText')}</p>
            </div>
            <Link className="btn btn--white" href="/contact">{t('partners.ctaBtn')} <ArrowRight className="ic" aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* ============ MAPA ============ */}
      <section className="section section--tight" id="mapa">
        <div className="wrap">
          <div className="section__head">
            <div>
              <p className="kicker">{t('home.mapKicker')}</p>
              <h2 className="h2">{t('home.mapTitle')}</h2>
            </div>
            <Link className="link" href={`/events?view=map${selectedCity ? `&city=${selectedCity}` : ''}`}>{t('home.openMap')} <ArrowRight className="ic" aria-hidden="true" /></Link>
          </div>
          <div style={{ height: 'clamp(320px, 45vw, 460px)', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--line)' }}>
            <ClientOnly fallback={<div className="skel" style={{ minHeight: '100%' }} />}>
              <EventMap
                events={mapEventsData?.events || []}
                center={city ? [city.lat, city.lng] : undefined}
                centerKey={selectedCity || 'all'}
                zoom={city?.zoom || 8}
              />
            </ClientOnly>
          </div>
        </div>
      </section>

      {/* ============ APP CTA ============ */}
      <section className="app-cta">
        <div className="wrap app-cta__inner">
          <img src="/brand/logo-512.png" alt="" width="160" height="160" className="app-cta__logo" loading="lazy" />
          <h2 className="app-cta__title">{t('home.ctaTitle1')}<br /><span>{t('home.ctaTitle2')}</span></h2>
          <p>{t('home.ctaText')}</p>
          <div className="app-cta__actions">
            <button type="button" className="btn btn--white" onClick={install}><Download className="ic" aria-hidden="true" />{t('home.install')}</button>
            {!loggedIn && <Link className="btn btn--pink" href="/signup">{t('nav.signup')}</Link>}
          </div>
          {installHint && <p role="status" style={{ marginTop: 16, marginBottom: 0 }}>{t('home.installHint')}</p>}
        </div>
      </section>
    </main>
  );
}
