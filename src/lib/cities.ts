/**
 * PODRŽANI GRADOVI — centralna lista.
 * Kada se doda novi grad, mijenja se SAMO ovaj fajl.
 */
export interface City {
  /** Stabilni identifikator (za URL parametre) */
  slug: string;
  /** Prikazno ime (nominativ) — dropdown, forme, baza */
  name: string;
  /** Lokativ — za rečenice "u [GRADU]" */
  locative: string;
  /** Koordinate centra (za mapu) */
  lat: number;
  lng: number;
  /** Default zoom za mapu grada */
  zoom?: number;
}

export const SUPPORTED_CITIES: City[] = [
  { slug: 'gradiska', name: 'Gradiška', locative: 'Gradišci', lat: 45.1465, lng: 17.2536, zoom: 13 },
  { slug: 'banja-luka', name: 'Banja Luka', locative: 'Banjoj Luci', lat: 44.7722, lng: 17.1910, zoom: 13 },
  { slug: 'prnjavor', name: 'Prnjavor', locative: 'Prnjavoru', lat: 44.8700, lng: 17.6625, zoom: 13 },
  { slug: 'srbac', name: 'Srbac', locative: 'Srpcu', lat: 45.0966, lng: 17.5242, zoom: 13 },
  { slug: 'doboj', name: 'Doboj', locative: 'Doboju', lat: 44.7318, lng: 18.0870, zoom: 13 },
  { slug: 'laktasi', name: 'Laktaši', locative: 'Laktašima', lat: 44.9086, lng: 17.3015, zoom: 13 },
  { slug: 'prijedor', name: 'Prijedor', locative: 'Prijedoru', lat: 44.9799, lng: 16.7140, zoom: 13 },
];

/** Lokativni oblik grada ("u Banjoj Luci") — za rečenice */
export function getCityLocative(slugOrName: string | null | undefined): string | null {
  const city = getCityBySlug(slugOrName) || getCityByName(slugOrName);
  return city ? city.locative : null;
}

/** Pronađi grad po slug-u */
export function getCityBySlug(slug: string | null | undefined): City | null {
  if (!slug) return null;
  return SUPPORTED_CITIES.find((c) => c.slug === slug) || null;
}

/** Pronađi grad po nazivu (toleriše mala/velika slova i dijakritike u ASCII varijanti) */
export function getCityByName(name: string | null | undefined): City | null {
  if (!name) return null;
  const n = normalizeCityName(name);
  return SUPPORTED_CITIES.find((c) => normalizeCityName(c.name) === n) || null;
}

/** Normalizacija naziva grada za poređenje ("GRADISKA"/"Gradiska" → "gradiska") */
export function normalizeCityName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/š/g, 's')
    .replace(/č/g, 'c')
    .replace(/ć/g, 'c')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .replace(/dž/g, 'dz');
}

/** Kanonski naziv grada iz bilo koje varijante unosa (za čuvanje u bazi) */
export function canonicalCityName(name: string | null | undefined): string | null {
  const city = getCityByName(name);
  if (city) return city.name;
  const trimmed = (name || '').trim();
  return trimmed.length > 0 ? trimmed : null;
}
