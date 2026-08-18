'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2, X, Link as LinkIcon } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  aspect?: 'video' | 'square';
}

/**
 * Upload naslovne slike (primarno) + opcioni link (fallback).
 * Upload ide na /api/upload (Vercel Blob u produkciji, disk lokalno).
 */
export function ImageUploader({ value, onChange, label = 'Slika', aspect = 'video' }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showLink, setShowLink] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Dozvoljene su samo slike (JPG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Slika je prevelika (maks 10MB).');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setError(data.error || 'Greška pri uploadu.');
      }
    } catch {
      setError('Mrežna greška pri uploadu.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">{label}</label>

      {/* Preview + upload zona */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`${aspect === 'square' ? 'aspect-square' : 'aspect-video'} w-full bg-surface border border-dashed rounded-xl flex items-center justify-center overflow-hidden relative cursor-pointer transition-all group ${
          error ? 'border-red-500/50' : 'border-border hover:border-primary'
        }`}
      >
        {value ? (
          <>
            <img src={value} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <span className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2">
                <Upload size={14} /> Zamijeni sliku
              </span>
            </div>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-3 text-muted">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Upload...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted group-hover:text-primary transition-colors">
            <Upload size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest">Klikni za upload slike</span>
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-wider">JPG · PNG · GIF · WebP (maks 10MB)</span>
          </div>
        )}

        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-red-500 transition-all"
            title="Ukloni sliku"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && (
        <p className="text-red-500 text-[10px] font-bold">{error}</p>
      )}

      {/* Opcioni link fallback */}
      <button
        type="button"
        onClick={() => setShowLink(!showLink)}
        className="text-[10px] font-black text-muted hover:text-white uppercase tracking-widest flex items-center gap-1.5 transition-colors"
      >
        <LinkIcon size={11} /> {showLink ? 'Sakrij link' : 'Ili zalijepi link slike'}
      </button>
      {showLink && (
        <input
          type="text"
          className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl focus:outline-none focus:border-primary text-sm"
          placeholder="https://..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
