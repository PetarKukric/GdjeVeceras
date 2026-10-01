'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Ticket, Heart, Share2, Users, Shirt, Flag, Send, AlertTriangle, ExternalLink,
  Zap, Sparkles, Navigation, Music2, Tag,
} from 'lucide-react';
import { VenueLocation } from '@/components/venues/VenueLocation';
import { CommentSection } from '@/components/comments/CommentSection';
import { ShareModal } from '@/components/share/ShareModal';
import { LiveFeed } from '@/components/events/LiveFeed';
import { PosterArt } from '@/components/ui/PosterArt';
import { useToast } from '@/components/ui/Toast';
import { useLang } from '@/components/i18n/LangProvider';
import { intlLocale } from '@/lib/i18n';
import { initials } from '@/lib/score';
import { trackEvent } from '@/lib/analytics';

const TZ = 'Europe/Sarajevo';

/* eslint-disable @typescript-eslint/no-explicit-any -- odgovor /api/events/[slug] nema zajednički tip */
export function EventPageClient({ slug, initialData }: { slug: string; initialData: any }) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [data] = useState<any>(initialData);
  const [user, setUser] = useState<any>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportText, setReportText] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [failedImage, setFailedImage] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    (async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return;
      const result = await res.json();
      setUser(result.user);
      const favRes = await fetch(`/api/favorites?userId=${result.user.id}`);
      if (favRes.ok) setIsFavorited(((await favRes.json()).eventIds || []).includes(initialData.event.id));
    })().catch(() => {});
  }, [initialData.event.id]);

  useEffect(() => {
    trackEvent('view_event', { event_id: initialData.event.id }, `view-event:${initialData.event.id}`);
  }, [initialData.event.id]);

  const toggleFavorite = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) { window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`; return; }
      const session = await sessionRes.json();
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, eventId: data.event.id }),
      });
      if (res.ok) {
        const result = await res.json();
        setIsFavorited(result.favorited);
        showToast(result.favorited ? t('event.saved') : t('event.unsaved'));
      }
    } catch {}
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) { window.location.href = '/login'; return; }
      const session = await sessionRes.json();
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: data.event.id, userId: session.user.id, reason: reportReason, description: reportText }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => setIsReporting(false), 2000);
      }
    } catch {}
  };

  if (!data) return null;
  const { event, related } = data;
  const image = !failedImage && (event.imageUrl || event.venue?.imageUrl);
  const startDate = new Date(event.startDateTime);
  const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
  const isOwner = user && (user.id === event.venue?.ownerId || user.role === 'ADMIN');
  const isLive = now !== null && Boolean(endDate) && startDate.getTime() <= now && endDate!.getTime() > now;
  const locale = intlLocale(lang);
  const fmtDate = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(d);
  const time = (d: Date) => fmtDate(d, { hour: '2-digit', minute: '2-digit', hour12: false });
  const longDate = fmtDate(startDate, { weekday: 'long', day: 'numeric', month: 'long' });
  const price = typeof event.price === 'number' && event.price > 0 ? `${event.price} ${event.currency || 'KM'}` : event.price === 0 ? t('event.free') : t('eventDetail.priceUnknown');
  const dress = event.dressCodeType === 'SPECIAL' ? event.dressCodeName : t(`eventDetail.dress.${event.dressCodeType}`);
  const hasCoords = typeof event.venue?.latitude === 'number' && typeof event.venue?.longitude === 'number';
  const directions = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${event.venue.latitude},${event.venue.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue.name} ${event.venue.address} ${event.venue.city}`)}`;


  return (
    <div className="flex-grow flex flex-col">
      <main className="detail event-detail">
        {/* ============ HERO ============ */}
        <section className="wrap">
          <div className="dhero dhero--event">
            <div className="dhero__bg" aria-hidden="true">
              {image ? <img src={image} alt="" fetchPriority="high" decoding="async" onError={() => setFailedImage(true)} /> : <PosterArt seed={event.id} className="dhero__poster" />}
            </div>
            <div className="dhero__top">
              <Link href="/events" className="dhero__back">← {t('nav.events')}</Link>
              <div className="dhero__icons">
                <button onClick={() => setIsShareModalOpen(true)} aria-label={t('eventDetail.share')}><Share2 size={18} aria-hidden="true" /></button>
                <button onClick={toggleFavorite} aria-pressed={isFavorited} aria-label={isFavorited ? t('event.unsaveAria', { title: event.title }) : t('event.saveAria', { title: event.title })} className={isFavorited ? 'is-on' : ''}>
                  <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="dhero__body">
              <div className="event__date dhero__date" aria-hidden="true">
                <small>{fmtDate(startDate, { weekday: 'short' }).replace('.', '')}</small>
                <b>{fmtDate(startDate, { day: 'numeric' }).replace('.', '')}</b>
                <small className="dhero__month">{fmtDate(startDate, { month: 'short' }).replace('.', '')}</small>
              </div>
              <div className="dhero__text">
                <p className="kicker">
                  {t(`categories.${event.category}`)}{isLive && <span className="tag-hot tag-live dhero__live">{t('event.live')}</span>}
                </p>
                <h1 className="h1">{event.title}</h1>
                {event.performers && <p className="dhero__perf"><Music2 size={16} aria-hidden="true" />{event.performers}</p>}
                <div className="chips-row">
                  <span className="mchip"><Calendar size={15} aria-hidden="true" />{longDate}</span>
                  <span className="mchip"><Clock size={15} aria-hidden="true" />{time(startDate)}{endDate ? ` – ${time(endDate)}` : ''}</span>
                  <Link className="mchip mchip--link" href={`/venues/${event.venue.slug}`}><MapPin size={15} aria-hidden="true" />{event.venue.name}</Link>
                  {event.venue?.isPartner && <span className="mchip mchip--pink"><Zap size={15} aria-hidden="true" />+{event.venue.checkInPoints ?? 100} {t('score.ptsAbbr')}</span>}
                </div>
              </div>
              <div className="dhero__cta">
                {event.ticketUrl && <a className="btn btn--pink" href={event.ticketUrl} target="_blank" rel="noopener noreferrer"><Ticket className="ic" aria-hidden="true" />{t('eventDetail.tickets')}</a>}
              </div>
            </div>
          </div>
        </section>

        <div className="wrap dgrid">
          <div className="dgrid__main">
            <section id="detalji" className="dsec">
              <h2 className="dsec__title">{t('eventDetail.about')}</h2>
              <p className="dsec__lead">{event.description || t('eventDetail.noDescription')}</p>
              <dl className="facts">
                <div><dt><Calendar size={16} aria-hidden="true" />{t('eventDetail.date')}</dt><dd>{longDate}</dd></div>
                <div><dt><Clock size={16} aria-hidden="true" />{t('eventDetail.time')}</dt><dd>{time(startDate)}{endDate ? ` – ${time(endDate)}` : ''}</dd></div>
                <div><dt><Ticket size={16} aria-hidden="true" />{t('eventDetail.price')}</dt><dd>{price}</dd></div>
                <div><dt><Tag size={16} aria-hidden="true" />{t('eventDetail.category')}</dt><dd>{t(`categories.${event.category}`)}</dd></div>
                <div><dt><Users size={16} aria-hidden="true" />{t('eventDetail.age')}</dt><dd>{event.minimumAge ? `${event.minimumAge}+` : t('eventDetail.allAges')}</dd></div>
                <div><dt><Shirt size={16} aria-hidden="true" />{t('eventDetail.dressCode')}</dt><dd>{dress}</dd></div>
              </dl>
              {event.dressCodeType !== 'NONE' && event.dressCodeDescription && (
                <p className="dnote"><Shirt size={16} aria-hidden="true" />{event.dressCodeDescription}</p>
              )}
            </section>

            <section id="live-feed" className="dsec">
              <LiveFeed eventSlug={slug} isOwner={isOwner} isLive={isLive} />
            </section>

            <section id="organizator" className="dsec">
              <h2 className="dsec__title">{t('eventDetail.where')}</h2>
              <Link href={`/venues/${event.venue.slug}`} className="vcard">
                <div className="vcard__img">{event.venue.imageUrl ? <img src={event.venue.imageUrl} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(event.venue.name)}</span>}</div>
                <div className="vcard__body">
                  <b>{event.venue.name}</b>
                  <span>{event.venue.address}, {event.venue.city}</span>
                  {event.venue.description && <span className="vcard__desc">{event.venue.description}</span>}
                </div>
                <span className="link">{t('eventDetail.venueProfile')} →</span>
              </Link>
              {event.additionalVenues?.length > 0 && (
                <>
                  <p className="ci-note" style={{ textAlign: 'left', margin: '18px 0 10px' }}>{t('eventDetail.alsoAt')}</p>
                  <div className="venues venues--2">
                    {event.additionalVenues.map((av: any) => (
                      <Link key={av.id} href={`/venues/${av.venue.slug}`} className="vcard">
                        <div className="vcard__img">{av.venue.imageUrl ? <img src={av.venue.imageUrl} alt="" loading="lazy" /> : <span aria-hidden="true">{initials(av.venue.name)}</span>}</div>
                        <div className="vcard__body"><b>{av.venue.name}</b><span>{[av.venue.city, av.venue.address].filter(Boolean).join(' · ')}</span></div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section id="komentari" className="dsec">
              <CommentSection eventId={event.id} currentUser={user} />
            </section>

            <button type="button" className="link dreport" onClick={() => { setReportSuccess(false); setIsReporting(true); }}>
              <Flag size={14} aria-hidden="true" />{t('eventDetail.report')}
            </button>
          </div>

          <aside className="dgrid__side">
            <div className="dcard dcard--cta">
              <p className="panel__title">{t('eventDetail.goingTitle')}</p>
              <div className="ci-actions" style={{ marginTop: 0 }}>
                {event.ticketUrl && <a className="btn btn--white btn--block" href={event.ticketUrl} target="_blank" rel="noopener noreferrer"><Ticket className="ic" aria-hidden="true" />{t('eventDetail.tickets')}</a>}
                <button className={`btn btn--block ${isFavorited ? 'btn--pink' : 'btn--ghost'}`} onClick={toggleFavorite} aria-pressed={isFavorited}>
                  <Heart className="ic" fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />{isFavorited ? t('eventDetail.savedBtn') : t('eventDetail.saveBtn')}
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setIsShareModalOpen(true)}><Share2 className="ic" aria-hidden="true" />{t('eventDetail.share')}</button>
              </div>
              {event._count?.favorites > 0 && <p className="ci-note" style={{ marginTop: 12 }}>{t('event.savedBy', { n: event._count.favorites })}</p>}
            </div>

            <div id="lokacija" className="dcard">
              <p className="panel__title">{t('venue.location')}</p>
              <p className="dcard__addr"><b>{event.venue.address}</b><span>{event.venue.city}</span></p>
              {hasCoords && <div className="dcard__map"><VenueLocation venue={event.venue} hideHeader /></div>}
              <a className="btn btn--ghost btn--block btn--sm" href={directions} target="_blank" rel="noopener noreferrer"><Navigation className="ic" aria-hidden="true" />{t('venue.directions')} <ExternalLink className="ic" aria-hidden="true" /></a>
            </div>

            <div className="dcard">
              <p className="panel__title"><span>{user ? t('eventDetail.youMightLike') : t('eventDetail.similar')}</span><Link href="/events" className="link" style={{ minHeight: 0 }}>{t('home.allEvents')}</Link></p>
              {related.similarEvents.length > 0 ? (
                <div className="mini-list">
                  {related.similarEvents.slice(0, 4).map((e: any) => (
                    <Link key={e.id} href={`/events/${e.slug}`} className="mini">
                      <span className="mini__img">{e.imageUrl || e.venue?.imageUrl ? <img src={e.imageUrl || e.venue?.imageUrl} alt="" loading="lazy" /> : <PosterArt seed={e.id} className="event__art" />}</span>
                      <span className="mini__body">
                        <b>{e.title}</b>
                        <small>{e.venue?.name} · {fmtDate(new Date(e.startDateTime), { weekday: 'short', day: 'numeric', month: 'numeric' })} {time(new Date(e.startDateTime))}</small>
                        {e.recommendationReason && <small className="pink"><Sparkles size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />{e.recommendationReason}</small>}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : <p className="ci-note" style={{ margin: 0, textAlign: 'left' }}>{t('eventDetail.noSimilar')}</p>}
            </div>
          </aside>
        </div>

        {isReporting && (
          <div className="lightbox" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={(e) => { if (e.target === e.currentTarget) setIsReporting(false); }}>
            <div className="panel" style={{ maxWidth: 440, width: '100%' }}>
              <p className="h3" id="report-title" style={{ marginBottom: 18 }}><AlertTriangle className="ic" aria-hidden="true" style={{ color: '#fca5a5' }} />{t('eventDetail.reportTitle')}</p>
              {reportSuccess ? (
                <div className="alert alert--ok" role="status"><Send className="ic" aria-hidden="true" />{t('eventDetail.reportThanks')}</div>
              ) : (
                <form onSubmit={submitReport} className="form" style={{ marginTop: 0 }}>
                  <label className="field"><span>{t('eventDetail.reportReason')}</span>
                    <select className="input" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                      {['event_cancelled', 'wrong_date', 'wrong_price', 'other'].map((r) => <option key={r} value={r}>{t(`eventDetail.reasons.${r}`)}</option>)}
                    </select>
                  </label>
                  <label className="field"><span>{t('eventDetail.reportDetails')}</span>
                    <textarea className="input" rows={4} style={{ paddingBlock: 12 }} value={reportText} onChange={(e) => setReportText(e.target.value)} required />
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setIsReporting(false)}>{t('profile.cancel')}</button>
                    <button type="submit" className="btn btn--pink" style={{ flex: 1 }}><Send className="ic" aria-hidden="true" />{t('eventDetail.send')}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          type="event"
          data={{ id: event.id, title: event.title, slug: event.slug, imageUrl: event.imageUrl || event.venue?.imageUrl, date: event.occurrenceDate || undefined }}
        />
      </main>

    </div>
  );
}
