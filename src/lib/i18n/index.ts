import { sr } from './sr';
import { en } from './en';

export type Lang = 'sr' | 'en';
export type Dict = typeof sr;
export type TVars = Record<string, string | number>;
export type TFunction = (key: string, vars?: TVars) => string;

export const LANGS: Lang[] = ['sr', 'en'];
export const DEFAULT_LANG: Lang = 'sr';
export const LANG_COOKIE = 'gv_lang';

const dictionaries: Record<Lang, Dict> = { sr, en };

export function normalizeLang(value: string | null | undefined): Lang {
  return value === 'en' ? 'en' : 'sr';
}

/** BCP 47 oznaka za <html lang> i Intl formatiranje */
export function htmlLang(lang: Lang): string {
  return lang === 'en' ? 'en' : 'sr-Latn';
}

export function intlLocale(lang: Lang): string {
  return lang === 'en' ? 'en-GB' : 'sr-Latn-BA';
}

function lookup(dict: Dict, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), dict);
}

/** t('home.title', { city: 'Banja Luka' }) — {city} u tekstu se zamjenjuje. Nepoznat ključ vraća sam ključ. */
export function translate(lang: Lang, key: string, vars?: TVars): string {
  let value = lookup(dictionaries[lang], key);
  if (typeof value !== 'string') value = lookup(dictionaries.sr, key);
  if (typeof value !== 'string') return key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function makeT(lang: Lang): TFunction {
  return (key, vars) => translate(lang, key, vars);
}

export function formatNumber(lang: Lang, value: number): string {
  return new Intl.NumberFormat(intlLocale(lang)).format(value);
}
