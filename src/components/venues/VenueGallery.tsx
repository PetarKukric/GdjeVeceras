'use client';

import React, { useState} from 'react';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Play
} from 'lucide-react';
import {} from '@/components/ui/ClientOnly';

interface VenueImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
  type?: 'IMAGE' | 'VIDEO';
  event?: { title: string, startDateTime: string };
}

interface VenueGalleryProps {
  venueId: string;
  ownerId?: string | null;
  images: VenueImage[];
  currentUser: any;
  onRefresh: () => void;
  hideHeader?: boolean;
  limit?: number;
}

export function VenueGallery({ venueId, ownerId, images, currentUser, onRefresh, hideHeader = false, limit }: VenueGalleryProps) {
  const [isUploading, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  const isOwner = currentUser && (currentUser.id === ownerId || currentUser.role === 'ADMIN');

  const displayedImages = limit ? images.slice(0, limit) : images;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSending(true);
    setError('');
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        setUploadProgress(`Uploadovanje ${i + 1}/${totalFiles}...`);
        const file = files[i];

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Slika ${file.name} je prevelika (maks 10MB).`);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('venueId', venueId);

        const res = await fetch(`/api/venues/${venueId}/gallery`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Greška pri uploadu.');
        }
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSending(false);
      setUploadProgress('');
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Da li želite obrisati ovu fotografiju?')) return;

    try {
      const res = await fetch(`/api/venues/${venueId}/gallery?imageId=${imageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri brisanju.');
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  const setAsCover = async (imageUrl: string) => {
    try {
      const res = await fetch(`/api/venues/${venueId}/gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setCover', imageUrl }),
      });

      if (res.ok) {
        onRefresh();
        alert('Naslovna slika je ažurirana.');
      } else {
        const data = await res.json();
        alert(data.error || 'Greška pri postavljanju naslovne slike.');
      }
    } catch {
      alert('Mrežna greška.');
    }
  };

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  return (
    <section className="space-y-8 animate-fade-up">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
             <div className="w-8 h-px bg-primary" /> GALERIJA
          </h2>
          
          {isOwner && (
            <div className="relative">
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                onChange={handleUpload}
                disabled={isUploading}
              />
              <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">
                {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                {isOwner && (isUploading ? uploadProgress : 'Dodaj slike')}
              </button>
            </div>
          )}
        </div>
      )}

      {isOwner && hideHeader && (
          <div className="flex justify-end mb-4">
             <div className="relative">
              <input 
                type="file" 
                multiple 
                accept="image/*,video/*" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                onChange={handleUpload}
                disabled={isUploading}
              />
              <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">
                {isUploading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                {isUploading ? uploadProgress : 'Dodaj slike'}
              </button>
            </div>
          </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-bold">
           <AlertCircle size={16} /> {error}
        </div>
      )}

      {images.length === 0 ? (
        <div className="bg-surface/30 border border-dashed border-border/50 rounded-3xl p-16 text-center">
           <ImageIcon size={48} className="mx-auto mb-6 text-muted opacity-20" />
           <p className="text-muted text-sm font-medium uppercase tracking-widest">
             {isOwner ? 'Još nemaš fotografija ovog lokala.' : 'Galerija još nema fotografija.'}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedImages.map((image) => {
            const originalIndex = images.findIndex(img => img.id === image.id);
            return (
              <div 
                key={image.id} 
                className="aspect-square relative group rounded-3xl overflow-hidden cursor-pointer shadow-xl border border-white/5"
                onClick={() => openLightbox(originalIndex)}
              >
                <img
                  src={image.imageUrl}
                  alt="Fotografija lokala"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                  {image.type === 'VIDEO' ? <Play className="text-white fill-current" size={32} /> : <ImageIcon className="text-white" size={24} />}
                  {image.event && (
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mt-2 line-clamp-2">
                       {image.event.title}
                    </p>
                  )}
                </div>
                
                {image.type === 'VIDEO' && (
                   <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[7px] font-black text-white uppercase tracking-widest border border-white/10">
                      VIDEO
                   </div>
                )}
                
                {isOwner && (
                  <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsCover(image.imageUrl);
                      }}
                      className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:text-primary transition-all shadow-lg"
                      title="Postavi kao naslovnu"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:text-red-500 transition-all shadow-lg"
                      title="Obriši"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={closeLightbox}
        >
          <button 
            className="absolute top-8 right-8 text-white hover:text-primary transition-all"
            onClick={closeLightbox}
          >
            <X size={32} />
          </button>

          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary transition-all"
            onClick={prevImage}
          >
            <ChevronLeft size={24} />
          </button>

          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary transition-all"
            onClick={nextImage}
          >
            <ChevronRight size={24} />
          </button>

          <div className="max-w-5xl max-h-[80vh] relative flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {images[lightboxIndex].type === 'VIDEO' ? (
               <video 
                  src={images[lightboxIndex].imageUrl} 
                  className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300" 
                  controls 
                  autoPlay
               />
            ) : (
               <img 
                 src={images[lightboxIndex].imageUrl} 
                 alt="" 
                 className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300" 
               />
            )}
            <div className="absolute -bottom-16 left-0 w-full text-center space-y-2">
               {images[lightboxIndex].event && (
                  <p className="text-primary font-black uppercase text-[10px] tracking-widest animate-pulse">
                     Događaj: {images[lightboxIndex].event.title}
                  </p>
               )}
               <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
                 Fotografija {lightboxIndex + 1} / {images.length}
               </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
