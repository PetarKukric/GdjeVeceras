'use client';

export const CITY_STORAGE_KEY = 'gdjeveceras:selected-city';

export function readSavedCity(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(CITY_STORAGE_KEY) || ''; } catch { return ''; }
}

export function saveCity(city: string) {
  if (typeof window === 'undefined') return;
  try { if (city) window.localStorage.setItem(CITY_STORAGE_KEY, city);
  else window.localStorage.removeItem(CITY_STORAGE_KEY); } catch {}
}
