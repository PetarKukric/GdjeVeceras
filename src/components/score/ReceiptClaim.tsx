'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, Loader2, QrCode, Receipt } from 'lucide-react';
import { useLang } from '@/components/i18n/LangProvider';

/**
 * Bonus za račun poslije check-ina: iznos + fotka računa + (opciono) QR fiskalnog računa očitan sa fotke.
 * QR se čita u pregledaču (jsQR) iz iste fotke — gost ne mora ništa posebno skenirati.
 * Bodovi stižu tek kad lokal/admin odobri račun.
 */
export function ReceiptClaim({ checkInId, minAmount, bonus }: { checkInId: string; minAmount: number; bonus: number }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const readQr = async (file: File) => {
    setReading(true);
    setQrData(null);
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const jsQR = (await import('jsqr')).default;
      const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
      setQrData(found?.data || null);
    } catch {
      setQrData(null);
    } finally {
      setReading(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    readQr(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!photo) { setError(t('receipt.errors.noPhoto')); return; }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('checkInId', checkInId);
      form.append('amount', amount.replace(',', '.'));
      form.append('photo', photo);
      if (qrData) form.append('qrData', qrData);
      const res = await fetch('/api/checkin/receipt', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = `receipt.errors.${data.error}`;
        setError(t(key, { min: minAmount }) === key ? t('checkin.errors.server') : t(key, { min: minAmount }));
        return;
      }
      setDone(true);
    } catch {
      setError(t('checkin.errors.network'));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <div className="alert alert--ok receipt-box" role="status"><Check className="ic" aria-hidden="true" />{t('receipt.sent', { n: bonus })}</div>;

  if (!open) {
    return (
      <button type="button" className="receipt-cta" onClick={() => setOpen(true)}>
        <span className="how__ic"><Receipt className="ic" aria-hidden="true" /></span>
        <span><b>{t('receipt.ctaTitle', { n: bonus })}</b><small>{t('receipt.ctaText', { min: minAmount })}</small></span>
      </button>
    );
  }

  return (
    <form className="panel receipt-box" onSubmit={submit}>
      <p className="panel__title"><span><Receipt size={14} aria-hidden="true" style={{ display: 'inline', marginRight: 8, verticalAlign: -2 }} />{t('receipt.title')}</span></p>
      <label className="field"><span>{t('receipt.amount', { min: minAmount })}</span>
        <input className="input" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(minAmount)} />
      </label>
      <label className="ci-photo" style={{ aspectRatio: '4 / 5', marginTop: 12 }}>
        {preview ? <img src={preview} alt={t('receipt.photoAlt')} /> : (
          <span className="ci-photo__cta"><Camera className="ic" aria-hidden="true" />{t('receipt.photo')}<small style={{ color: 'var(--muted)', fontWeight: 600 }}>{t('receipt.photoHint')}</small></span>
        )}
        <input type="file" accept="image/*" capture="environment" onChange={pick} aria-label={t('receipt.photo')} />
      </label>
      {photo && (
        <p className={`receipt-qr${qrData ? ' is-ok' : ''}`}>
          {reading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <QrCode size={15} aria-hidden="true" />}
          {reading ? t('receipt.qrReading') : qrData ? t('receipt.qrFound') : t('receipt.qrMissing')}
        </p>
      )}
      {error && <div className="alert alert--error" role="alert"><AlertCircle className="ic" aria-hidden="true" />{error}</div>}
      <button className="btn btn--pink btn--block" disabled={busy || reading} style={{ marginTop: 12 }}>
        {busy ? <Loader2 className="ic animate-spin" aria-hidden="true" /> : <Check className="ic" aria-hidden="true" />}{t('receipt.submit')}
      </button>
      <p className="ci-note" style={{ marginTop: 10, fontSize: 13 }}>{t('receipt.review')}</p>
    </form>
  );
}
