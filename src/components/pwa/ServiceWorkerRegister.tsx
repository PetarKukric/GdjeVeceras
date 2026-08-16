'use client';

import { useEffect } from 'react';

// Registruje PWA service worker (samo u produkciji ili ako je omogućen)
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // PWA je opcionalno poboljšanje — greške se ignorišu
      });
    }
  }, []);

  return null;
}
