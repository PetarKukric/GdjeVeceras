/**
 * Izgled mape (tile slojevi) — bez API ključa, zauvijek besplatno.
 *
 * Zašto Esri Dark Gray? Ranije se koristio CARTO (basemaps.cartocdn.com),
 * ali je CARTO počeo tražiti API ključ — mapa je onda ispisivala
 * "API key required" preko tile-ova. Esri Dark Gray je tamna mapa
 * koja ne zahtijeva nikakav ključ ni registraciju.
 *
 * Ako ikad poželiš drugi izgled, promijeni samo ovaj fajl — obje mape
 * (EventMap i VenueMap) ga koriste.
 */

export const MAP_TILES_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

// Imena gradova/ulica preko tamne podloge (opciono, isto bez ključa)
export const MAP_TILES_LABELS_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';

export const MAP_TILES_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community';
