/**
 * Validates if a string is a valid email format.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  // Basic but robust regex for email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Normalizes an email by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Validates a Bosnian (BiH) phone number.
 * Prihvaćeni formati:
 *   +387 66 123 456, +38766123456, 066 123 456, 066/123-456, 066123456
 * Pravila: pozivni +387 + 8 cifara, ili vodeća 0 + 8 cifara (ukupno 9).
 */
export function isValidBosnianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.()\/]/g, '');
  if (/^\+387/.test(cleaned)) {
    return /^\+387\d{8}$/.test(cleaned);
  }
  if (/^0/.test(cleaned)) {
    return /^0\d{8}$/.test(cleaned);
  }
  return false;
}

/**
 * Link iz forme (sajt, Instagram, karte, slika): dozvoljeni samo http(s) i naši relativni putevi (/uploads/...).
 * Sprečava `javascript:` / `data:` linkove koji bi se izvršili kad neko klikne. undefined ostaje undefined (polje se ne mijenja).
 */
export function safeUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim().slice(0, 1000);
  if (v.startsWith('/') && !v.startsWith('//')) return v;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
