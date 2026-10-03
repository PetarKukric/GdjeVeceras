'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Link as LinkIcon, Share2, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'event' | 'venue';
  data: {
    id: string;
    title: string;
    slug: string;
    imageUrl?: string;
    date?: string;
  };
}

/** Dijeljenje događaja/lokala van sajta (sistemski share meni ili kopiranje linka) */
export function ShareModal({ isOpen, onClose, type, data }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${type === 'event' ? 'events' : 'venues'}/${data.slug}${data.date ? `?date=${data.date}` : ''}`
    : '';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API not available');
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Link kopiran');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: data.title, text: `Pogledaj ${data.title} na Gdje Večeras!`, url: shareUrl });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <dialog ref={dialogRef} className="vgate" aria-labelledby="share-title" onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {isOpen && (
        <div className="vgate__card share">
          <button type="button" className="vgate__close" onClick={onClose} aria-label="Zatvori"><X aria-hidden="true" /></button>
          <p className="kicker">{type === 'event' ? 'Događaj' : 'Lokal'}</p>
          <h2 id="share-title" className="h2">Podijeli</h2>
          <p className="vgate__lead"><b>{data.title}</b></p>
          <div className="vgate__actions">
            <button type="button" className="btn btn--pink" onClick={handleNativeShare}><Share2 className="ic" aria-hidden="true" />Podijeli</button>
            <button type="button" className="btn btn--ghost" onClick={handleCopyLink}>
              {copied ? <Check className="ic" aria-hidden="true" /> : <LinkIcon className="ic" aria-hidden="true" />}
              {copied ? 'Kopirano' : 'Kopiraj link'}
            </button>
          </div>
          {copyError && (
            <label className="share__manual">
              <span>Ručno kopiraj link:</span>
              <input readOnly className="input" value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
            </label>
          )}
        </div>
      )}
    </dialog>
  );
}
