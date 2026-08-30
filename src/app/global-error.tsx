'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bs">
      <body className="bg-background text-text min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <AlertTriangle size={44} className="text-primary" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter mb-4" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Nešto je pošlo po zlu
          </h1>
          <p className="text-muted text-lg mb-10" style={{ fontFamily: 'system-ui, sans-serif' }}>
            Došlo je do greške na serveru. Pokušajte ponovo.
          </p>
          <button
            onClick={reset}
            className="h-14 px-10 bg-primary text-white font-black rounded-xl uppercase tracking-[0.2em] text-[10px] hover:opacity-90 transition-all inline-flex items-center justify-center gap-2"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            <RotateCcw size={16} /> Pokušaj ponovo
          </button>
        </div>
      </body>
    </html>
  );
}
