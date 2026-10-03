'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, Check, Globe, Loader2, LocateFixed, QrCode, AlertCircle, Users, Zap } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';
import { SCORE_EVENT } from '@/components/layout/Header';
import { CHECKIN_RULES } from '@/lib/score';
import { ReceiptClaim } from '@/components/score/ReceiptClaim';
import { signupUrl } from '@/lib/guest';

type Mode = 'qr' | 'photo';
interface NearbyVenue { id: string; name: string; slug: string; city: string; distanceM: number; checkInPoints: number }
interface CheckInResult {
  id: string; points: number; base: number; balance: number; total: number;
  bonuses: { type: 'partner' | 'boost' | 'streak'; amount: number }[];
  streak: number; multiplier: number;
  receipt: { minAmount: number; bonus: number } | null;
  tierBefore: number; tierAfter: number;
  venue: { name: string; slug: string };
  event: { title: string } | null;
}
interface Position { lat: number; lng: number; accuracy: number }

// BarcodeDetector nije u TS DOM tipovima
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global { interface Window { BarcodeDetector?: new (opts: { formats: string[] }) => Detector } }

function parseCheckInUrl(raw: string): { venue: string; code: string } | null {
  try {
    const url = new URL(raw, window.location.origin);
    const venue = url.searchParams.get('v');
    const code = url.searchParams.get('k');
    return venue && code && url.pathname.replace(/\/$/, '').endsWith('/checkin') ? { venue, code } : null;
  } catch {
    return null;
  }
}

function getPosition(timeout = 10000): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('unsupported')); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    );
  });
}

export function CheckInClient({ loggedIn, qrVenue, qrCode }: { loggedIn: boolean; qrVenue: string; qrCode: string }) {
  const { t, fmt } = useLang();
  const [mode, setMode] = useState<Mode>('qr');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);

  // QR
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');

  // Fotka + lokacija
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearby, setNearby] = useState<NearbyVenue[] | null>(null);
  const [venueId, setVenueId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS'>('PUBLIC');

  const errorText = useCallback((code: string, extra?: { nextAt?: string; distance?: number }) => {
    if (code === 'cooldown' && extra?.nextAt) {
      const time = new Date(extra.nextAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return t('checkin.errors.cooldown', { time });
    }
    if (code === 'tooFar' && typeof extra?.distance === 'number') return t('checkin.errors.tooFar', { m: fmt(extra.distance) });
    const key = `checkin.errors.${code}`;
    const text = t(key);
    return text === key ? t('checkin.errors.server') : text;
  }, [t, fmt]);

  const finish = (data: CheckInResult) => {
    setResult(data);
    window.dispatchEvent(new CustomEvent(SCORE_EVENT, { detail: { balance: data.balance, total: data.total } }));
    if ('vibrate' in navigator) navigator.vibrate?.([30, 40, 60]);
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const submitQr = useCallback(async (venue: string, code: string) => {
    setBusy(true);
    setError('');
    // Lokacija je opciona za QR — ako je korisnik dozvoli, štiti od skeniranja fotke QR-a od kuće
    let pos: Position | null = null;
    try { pos = await getPosition(6000); } catch { /* bez lokacije */ }
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'QR', venue, code, lat: pos?.lat, lng: pos?.lng, accuracy: pos?.accuracy }),
      });
      const data = await res.json();
      if (res.ok) finish(data);
      else setError(errorText(data.error, data));
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setBusy(false);
    }
  }, [errorText, t]);

  // Otvoren link iz QR koda (skeniran kamerom telefona) → automatski check-in
  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoRan.current && loggedIn && qrVenue && qrCode) {
      autoRan.current = true;
      submitQr(qrVenue, qrCode);
    }
  }, [loggedIn, qrVenue, qrCode, submitQr]);

  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => { if (mode !== 'qr') stopCamera(); }, [mode, stopCamera]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const tick = async () => {
        if (!streamRef.current || video.readyState < 2) {
          if (streamRef.current) requestAnimationFrame(tick);
          return;
        }
        let raw: string | null = null;
        if (detector) {
          const codes = await detector.detect(video).catch(() => []);
          raw = codes[0]?.rawValue || null;
        } else if (jsQR) {
          const w = Math.min(640, video.videoWidth);
          const h = Math.round((video.videoHeight / video.videoWidth) * w);
          canvas.width = w; canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          raw = jsQR(ctx.getImageData(0, 0, w, h).data, w, h)?.data || null;
        }
        const parsed = raw ? parseCheckInUrl(raw) : null;
        if (parsed) {
          stopCamera();
          submitQr(parsed.venue, parsed.code);
          return;
        }
        if (raw) setError(t('checkin.errors.notOurQr'));
        setTimeout(() => requestAnimationFrame(tick), 180);
      };
      requestAnimationFrame(tick);
    } catch {
      stopCamera();
      setError(t('checkin.errors.camera'));
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCheckInUrl(manual.trim());
    if (parsed) submitQr(parsed.venue, parsed.code);
    else setError(t('checkin.errors.notOurQr'));
  };

  const locate = async () => {
    setLocating(true);
    setError('');
    try {
      const pos = await getPosition();
      setPosition(pos);
      const res = await fetch(`/api/checkin/nearby?lat=${pos.lat}&lng=${pos.lng}`);
      const data = await res.json();
      const list: NearbyVenue[] = data.venues || [];
      setNearby(list);
      const close = list.find((v) => v.distanceM <= CHECKIN_RULES.photoRadiusM + Math.min(pos.accuracy, CHECKIN_RULES.maxAccuracyToleranceM));
      if (close) setVenueId(close.id);
    } catch {
      setError(t('checkin.errors.location'));
    } finally {
      setLocating(false);
    }
  };

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submitPhoto = async () => {
    if (!photo || !venueId) return;
    setBusy(true);
    setError('');
    try {
      // Svježa lokacija u trenutku slanja (ne ona od prije par minuta)
      const pos = await getPosition().catch(() => position);
      if (!pos) { setError(t('checkin.errors.location')); return; }
      const form = new FormData();
      form.append('venueId', venueId);
      form.append('photo', photo);
      form.append('visibility', visibility);
      form.append('lat', String(pos.lat));
      form.append('lng', String(pos.lng));
      form.append('accuracy', String(pos.accuracy));
      const res = await fetch('/api/checkin', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) finish(data);
      else setError(errorText(data.error, data));
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null); setError(''); setPhoto(null); setPreview(''); setVenueId(''); setNearby(null); setPosition(null);
    if (qrVenue) window.history.replaceState(null, '', '/checkin');
  };

  if (!loggedIn) {
    const next = qrVenue ? `/checkin?v=${encodeURIComponent(qrVenue)}&k=${encodeURIComponent(qrCode)}` : '/checkin';
    return (
      <main className="page">
        <div className="wrap ci">
          <p className="kicker">{t('nav.checkin')}</p>
          <h1 className="h1">{t('checkin.guestTitle')}</h1>
          <p className="lead" style={{ marginInline: 'auto' }}>{t('checkin.guestText')}</p>
          <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto', marginTop: 28 }}>
            <Link className="btn btn--pink" href={signupUrl('checkin', next)}>{t('nav.signup')}</Link>
            <Link className="btn btn--ghost" href={`/login?next=${encodeURIComponent(next)}`}>{t('nav.login')}</Link>
          </div>
        </div>
      </main>
    );
  }

  if (result) {
    const bonusLabel = (type: string) => t(`checkin.bonus.${type}`);
    return (
      <main className="page">
        <div className="wrap ci ci-done" role="status">
          <div className="burst"><Check className="ic" aria-hidden="true" /></div>
          <p className="kicker">{result.venue.name}</p>
          <h1 className="h2">{t('checkin.doneTitle')}</h1>
          <p className="ci-plus">+{fmt(result.points)}</p>
          {result.bonuses.length > 0 && (
            <ul className="ci-bonus">
              <li>{t('checkin.bonus.base')} <b>+{result.base}</b></li>
              {result.bonuses.map((b) => <li key={b.type}>{b.type === 'streak' ? t('checkin.bonus.streakX', { n: result.streak, x: result.multiplier }) : bonusLabel(b.type)} <b>+{b.amount}</b></li>)}
            </ul>
          )}
          {result.receipt && <div style={{ maxWidth: 420, margin: '22px auto 0', textAlign: 'left' }}><ReceiptClaim checkInId={result.id} minAmount={result.receipt.minAmount} bonus={result.receipt.bonus} /></div>}
          <p className="lead" style={{ marginInline: 'auto' }}>
            {result.tierAfter > result.tierBefore
              ? t('checkin.levelUp', { tier: t(`tiers.${['rookie', 'regular', 'nightOwl', 'legend'][result.tierAfter]}.name`) })
              : t('checkin.balance', { n: fmt(result.balance) })}
          </p>
          <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto', marginTop: 28 }}>
            <Link className="btn btn--pink" href="/rewards"><Zap className="ic" aria-hidden="true" />{t('checkin.toRewards')}</Link>
            <Link className="btn btn--ghost" href="/profile">{t('checkin.toProfile')}</Link>
            <button className="link" style={{ justifyContent: 'center' }} onClick={reset}>{t('checkin.again')}</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="wrap ci">
        <p className="kicker">{t('nav.checkin')}</p>
        <h1 className="h1">{t('checkin.title')}</h1>
        <p className="lead" style={{ marginInline: 'auto' }}>{t('checkin.lead')}</p>

        <div className="seg" role="group" aria-label={t('checkin.modeAria')}>
          <button type="button" className="seg__btn" aria-pressed={mode === 'qr'} onClick={() => { setMode('qr'); setError(''); }}><QrCode size={16} aria-hidden="true" />&nbsp;{t('checkin.modeQr')}</button>
          <button type="button" className="seg__btn" aria-pressed={mode === 'photo'} onClick={() => { setMode('photo'); setError(''); }}><Camera size={16} aria-hidden="true" />&nbsp;{t('checkin.modePhoto')}</button>
        </div>

        {error && <div className="alert alert--error" role="alert" style={{ marginTop: 20, textAlign: 'left' }}><AlertCircle className="ic" aria-hidden="true" />{error}</div>}

        {busy && !scanning && <p className="ci-note" style={{ marginTop: 20 }}><Loader2 size={16} className="animate-spin inline" aria-hidden="true" /> {t('checkin.sending')}</p>}

        {mode === 'qr' ? (
          <>
            <div className="scanner">
              <span className="scanner__c scanner__c--tl" /><span className="scanner__c scanner__c--tr" />
              <span className="scanner__c scanner__c--bl" /><span className="scanner__c scanner__c--br" />
              <video ref={videoRef} playsInline muted style={{ display: scanning ? 'block' : 'none' }} />
              {!scanning && <QrCode className="scanner__qr" aria-hidden="true" />}
              <span className="scanner__line" />
            </div>
            <p className="ci-note">{scanning ? t('checkin.scanning') : t('checkin.qrHint')}</p>
            <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto' }}>
              {scanning
                ? <button className="btn btn--ghost" onClick={stopCamera}>{t('checkin.stopCamera')}</button>
                : <button className="btn btn--pink" onClick={startCamera} disabled={busy}><QrCode className="ic" aria-hidden="true" />{t('checkin.startCamera')}</button>}
            </div>
            <details style={{ marginTop: 18 }}>
              <summary className="link" style={{ cursor: 'pointer', justifyContent: 'center' }}>{t('checkin.manual')}</summary>
              <form className="ci-code" onSubmit={submitManual}>
                <label className="sr-only" htmlFor="ci-manual">{t('checkin.manualLabel')}</label>
                <input id="ci-manual" className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="https://gdjeveceras.com/checkin?v=…" />
                <button className="btn btn--pink btn--sm" type="submit" disabled={busy || !manual}>OK</button>
              </form>
            </details>
          </>
        ) : (
          <>
            {!nearby ? (
              <div style={{ marginTop: 24 }}>
                <p className="ci-note">{t('checkin.photoHint', { m: CHECKIN_RULES.photoRadiusM })}</p>
                <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto' }}>
                  <button className="btn btn--pink" onClick={locate} disabled={locating}>
                    {locating ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <LocateFixed className="ic" aria-hidden="true" />}
                    {locating ? t('checkin.locating') : t('checkin.locate')}
                  </button>
                </div>
              </div>
            ) : nearby.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}><b>{t('checkin.noneNearby')}</b>{t('checkin.noneNearbyText')}</div>
            ) : (
              <>
                <div className="ci-list" role="radiogroup" aria-label={t('checkin.pickVenue')}>
                  {nearby.map((v) => (
                    <button key={v.id} type="button" role="radio" aria-checked={venueId === v.id} className="ci-venue" onClick={() => setVenueId(v.id)}>
                      <span>{v.name}<small>{v.city} · {v.distanceM < 1000 ? `${fmt(v.distanceM)} m` : `${(v.distanceM / 1000).toFixed(1)} km`}</small></span>
                      <em>+{v.checkInPoints}</em>
                    </button>
                  ))}
                </div>
                <label className="ci-photo">
                  {preview ? <img src={preview} alt={t('checkin.photoPreview')} /> : (
                    <span className="ci-photo__cta"><Camera className="ic" aria-hidden="true" />{t('checkin.takePhoto')}</span>
                  )}
                  <input type="file" accept="image/*" capture="environment" onChange={pickPhoto} aria-label={t('checkin.takePhoto')} />
                </label>
                <fieldset className="ci-vis">
                  <legend>{t('checkin.visTitle')}</legend>
                  <div className="seg" role="radiogroup">
                    <button type="button" role="radio" className="seg__btn" aria-checked={visibility === 'PUBLIC'} onClick={() => setVisibility('PUBLIC')}>
                      <Globe size={16} aria-hidden="true" />&nbsp;{t('checkin.visPublic')}
                    </button>
                    <button type="button" role="radio" className="seg__btn" aria-checked={visibility === 'FRIENDS'} onClick={() => setVisibility('FRIENDS')}>
                      <Users size={16} aria-hidden="true" />&nbsp;{t('checkin.visFriends')}
                    </button>
                  </div>
                  <small>{visibility === 'PUBLIC' ? t('checkin.visPublicHint') : t('checkin.visFriendsHint')}</small>
                </fieldset>
                <div className="ci-actions" style={{ maxWidth: 360, marginInline: 'auto' }}>
                  <button className="btn btn--pink" onClick={submitPhoto} disabled={busy || !photo || !venueId}>
                    {busy ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <Check className="ic" aria-hidden="true" />}{t('checkin.submitPhoto')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <div className="panel ci-rules">
          <p className="panel__title">{t('checkin.rulesTitle')}</p>
          <ul>
            <li>{t('checkin.rule1', { h: CHECKIN_RULES.cooldownHours })}</li>
            <li>{t('checkin.rule2', { base: CHECKIN_RULES.basePoints, partner: CHECKIN_RULES.basePoints + CHECKIN_RULES.partnerBonus })}</li>
            <li>{t('checkin.rule3', { n: CHECKIN_RULES.streakStartWeekends, x: CHECKIN_RULES.streakStartMultiplier })}</li>
            <li>{t('checkin.rule4')}</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
