const DATE_TIME_ZONE = 'Europe/Sarajevo';

/** Korisnički prikaz datuma: 01.09.2026. */
export function formatSerbianDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DATE_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return day && month && year ? `${day}.${month}.${year}.` : '';
}

/** Primjer: Petak, 11.9. · 21:00 */
export function formatEventCardDate(value: Date | string | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = new Intl.DateTimeFormat('sr-Latn-BA', {
    timeZone: DATE_TIME_ZONE,
    weekday: 'long',
  }).format(date);
  const datePart = new Intl.DateTimeFormat('sr-Latn-BA', {
    timeZone: DATE_TIME_ZONE,
    day: 'numeric',
    month: 'numeric',
  }).format(date).replace(/\s/g, '');
  const time = new Intl.DateTimeFormat('sr-Latn-BA', {
    timeZone: DATE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${datePart} · ${time}`;
}
