'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Plus, 
  Loader2, 
  X, 
  Clock,
  Send,
  Trash2
} from 'lucide-react';

interface LiveMedia {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  caption?: string;
  createdAt: string;
  uploadedBy: { name: string };
}

interface LiveFeedProps {
  eventSlug: string;
  isOwner: boolean;
  isLive: boolean;
}

export function LiveFeed({ eventSlug, isOwner, isLive }: LiveFeedProps) {
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
      const res = await fetch(`/api/events/${eventSlug}/live`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch {
      console.error('Error fetching live media');
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

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
    return date.toLocaleDateString('bs');
  };

  if (loading && media.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-muted gap-4">
        <Loader2 className="animate-spin" size={24} />
        <p className="text-[10px] font-black uppercase tracking-widest">Učitavanje atmosfere...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <h2 className="text-xl font-black uppercase tracking-tight text-white">
            {isLive ? 'UŽIVO SA DOGAĐAJA' : 'ATMOSFERA SA DOGAĐAJA'}
          </h2>
        </div>

        {isOwner && isLive && (
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
          >
            <Plus size={14} /> DODAJ UPDATE
          </button>
        )}
      </div>

      {media.length === 0 ? (
        <div className="bg-surface/30 border border-dashed border-border/50 rounded-[2.5rem] p-16 text-center">
          <Camera size={48} className="mx-auto mb-6 text-muted opacity-20" />
          <p className="text-muted text-sm font-medium uppercase tracking-widest">
            {isLive ? 'Još nema objava uživo. Vlasnik će uskoro podijeliti atmosferu!' : 'Nema zabilježenih trenutaka sa ovog događaja.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item) => (
            <div key={item.id} className="bg-card border border-white/5 rounded-[2rem] overflow-hidden shadow-xl group flex flex-col">
              <div className="aspect-square relative overflow-hidden bg-black">
                {item.type === 'IMAGE' ? (
                  <img src={item.mediaUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <video 
                    src={item.mediaUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    muted 
                    playsInline 
                  />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  {isOwner && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(item.id);
                      }}
                      className="bg-black/50 backdrop-blur-md p-1.5 rounded-lg text-white hover:text-red-500 transition-colors border border-white/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                    {item.type === 'VIDEO' ? 'VIDEO' : 'FOTO'}
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {item.caption && (
                  <p className="text-sm font-medium text-white leading-relaxed">{item.caption}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                       {item.uploadedBy.name.charAt(0)}
                    </div>
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{item.uploadedBy.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> {formatTimeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-card border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
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
