'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Plus, 
  Loader2, 
  X, 
  Clock,
  Send,
  Trash2,
  Lock,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { formatSerbianDate } from '@/lib/date-format';
import { Avatar } from '@/components/ui/Avatar';

interface LiveMedia {
  id: string;
  /** OWNER = objava vlasnika, CHECKIN = fotka sa check-ina gosta, PHOTO = fotka sa profila gosta iz lokala */
  source: 'OWNER' | 'CHECKIN' | 'PHOTO';
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
  visibility: 'PUBLIC' | 'FRIENDS';
  uploadedBy: { id: string; name: string | null; avatarUrl: string | null };
}

interface LiveFeedProps {
  eventSlug: string;
  isOwner: boolean;
  isLive: boolean;
  /** Termin ponavljajućeg događaja (YYYY-MM-DD) */
  date?: string;
}

export function LiveFeed({ eventSlug, isOwner, isLive, date }: LiveFeedProps) {
  const [media, setMedia] = useState<LiveMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventSlug}/live${date ? `?date=${encodeURIComponent(date)}` : ''}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch {
      console.error('Error fetching live media');
    } finally {
      setLoading(false);
    }
  }, [eventSlug, date]);

  useEffect(() => {
    fetchMedia();
    // Polling every 15 seconds if live
    let interval: any;
    if (isLive) {
      interval = setInterval(fetchMedia, 15000);
    }
    return () => clearInterval(interval);
  }, [fetchMedia, isLive]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress('Slanje...');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('caption', caption);

    try {
      const res = await fetch(`/api/events/${eventSlug}/live`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setShowUploadModal(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        fetchMedia();
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri objavi.');
      }
    } catch {
      alert('Mrežna greška.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Da li želite obrisati ovu objavu?')) return;

    try {
      const res = await fetch(`/api/events/${eventSlug}/live?mediaId=${mediaId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchMedia();
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri brisanju.');
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Upravo sad';
    if (diffMin < 60) return `Prije ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Prije ${diffHours} h`;
    return formatSerbianDate(date);
  };

  if (loading && media.length === 0) {
    return (
      <div className="atmo atmo--loading" aria-busy="true">
        <Loader2 className="ic animate-spin" aria-hidden="true" />
        <span>Učitavanje atmosfere…</span>
      </div>
    );
  }

  return (
    <div className="atmo">
      <div className="atmo__head">
        <h2 className="dsec__title atmo__title">
          {isLive && <span className="atmo__dot" aria-hidden="true" />}
          {isLive ? 'Uživo sa događaja' : 'Atmosfera sa događaja'}
        </h2>
        {isOwner && isLive && (
          <button type="button" onClick={() => setShowUploadModal(true)} className="btn btn--pink btn--sm">
            <Plus className="ic" aria-hidden="true" />Dodaj objavu
          </button>
        )}
      </div>
      <p className="atmo__lead">Fotke vlasnika i gostiju koji su se čekirali fotkom ili objavili fotku iz lokala tokom događaja.</p>

      {media.length === 0 ? (
        <div className="empty">
          <b>{isLive ? 'Još nema objava' : 'Nema fotki sa ovog događaja'}</b>
          {isLive ? <>Budi prvi — <Link href="/checkin" className="link">čekiraj se fotkom</Link> i tvoja fotka se pojavi ovdje.</> : 'Niko nije objavio fotku dok je događaj trajao.'}
        </div>
      ) : (
        <ul className="atmo__grid">
          {media.map((item) => (
            <li key={item.id} className="atmo__card">
              <div className="atmo__media">
                {item.type === 'IMAGE' ? (
                  <img src={item.mediaUrl} alt={item.caption || `Fotka: ${item.uploadedBy.name || 'gost'}`} loading="lazy" decoding="async" />
                ) : (
                  <video src={item.mediaUrl} controls muted playsInline preload="metadata" />
                )}
                <div className="atmo__tags">
                  {item.source === 'OWNER' && <span className="atmo__tag atmo__tag--pink">Lokal</span>}
                  {item.source === 'CHECKIN' && <span className="atmo__tag"><MapPin aria-hidden="true" />Check-in</span>}
                  {item.visibility === 'FRIENDS' && <span className="atmo__tag"><Lock aria-hidden="true" />Samo prijatelji</span>}
                </div>
                {isOwner && item.source === 'OWNER' && (
                  <button type="button" onClick={() => handleDelete(item.id)} className="atmo__del" aria-label="Obriši objavu">
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </div>
              {item.caption && <p className="atmo__caption">{item.caption}</p>}
              <div className="atmo__foot">
                {item.source === 'OWNER'
                  ? <span className="atmo__who"><Avatar name={item.uploadedBy.name} url={item.uploadedBy.avatarUrl} className="row__av" /><b>{item.uploadedBy.name}</b></span>
                  : <Link href={`/u/${item.uploadedBy.id}`} className="atmo__who"><Avatar name={item.uploadedBy.name} url={item.uploadedBy.avatarUrl} className="row__av" /><b>{item.uploadedBy.name}</b></Link>}
                <time dateTime={item.createdAt}><Clock aria-hidden="true" />{formatTimeAgo(item.createdAt)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tight">Objavi uživo</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-surface border-2 border-dashed border-white/10 flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-colors">
                {previewUrl ? (
                  <div className="w-full h-full relative">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay loop />
                    ) : (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                    <Camera size={48} className="text-muted opacity-20 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Izaberi sliku ili video</p>
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Kratak opis (opciono)</label>
                <textarea 
                  className="w-full bg-surface/50 border border-white/5 rounded-2xl p-5 text-sm font-medium min-h-[100px] focus:outline-none focus:border-primary transition-all text-white placeholder:text-muted/30"
                  placeholder="Šta se dešava trenutno?"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={300}
                />
              </div>

              <button 
                type="submit"
                disabled={!selectedFile || isUploading}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 disabled:grayscale"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> {uploadProgress}
                  </>
                ) : (
                  <>
                    <Send size={18} /> OBJAVI UŽIVO
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
