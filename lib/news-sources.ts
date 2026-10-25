/**
 * Fuentes de información del sector.
 *
 * Están juntas y en un solo lugar porque son lo primero que cambia al llevar el
 * agente a otra marca o a otro sector: feeds, dominios que el modelo debe
 * priorizar y consultas de búsqueda. Se pueden sustituir por configuración, sin
 * tocar el código que las usa (HU-13, RNF-10).
 */

export type RssFeed = { url: string; source: string };

export const DEFAULT_RSS_FEEDS: RssFeed[] = [
  { url: 'https://thelogisticsworld.com/feed/', source: 'The Logistics World' },
  { url: 'https://logisticapress.com/feed/', source: 'Logística Press' },
  { url: 'https://transporte.mx/feed/', source: 'Transporte.mx' },
  { url: 'https://esemanal.mx/feed/', source: 'eSemanal' },
  { url: 'https://t21.com.mx/feed/', source: 'T21' },
  { url: 'https://revistalogisticaytransporte.com/feed/', source: 'Revista Énfasis Logística' },
  { url: 'https://alianzaflotillera.com/feed/', source: 'Alianza Flotillera' },
  { url: 'https://mexicanist.com/?feed=rss2', source: 'Mexicanist' },
];

export const DEFAULT_SEARCH_DOMAINS = [
  'thelogisticsworld.com',
  'elfinanciero.com.mx',
  'eleconomista.com.mx',
];

export const DEFAULT_SEARCH_QUERIES = [
  'logística México',
  'cadena de suministro México',
  'nearshoring México',
  'comercio exterior México',
  'transporte de carga México',
  'robo de carga México',
  'seguridad logística México',
  'CANACAR',
  'puertos México logística',
  'aranceles transporte México',
];

function parseList(value: string | undefined): string[] | null {
  if (!value || !value.trim()) return null;
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

/** Feeds RSS activos. `NEWS_RSS_FEEDS` acepta `url|nombre` separados por coma. */
export function getRssFeeds(): RssFeed[] {
  const configured = parseList(process.env.NEWS_RSS_FEEDS);
  if (!configured) return DEFAULT_RSS_FEEDS;

  return configured
    .map((entry) => {
      const [url, source] = entry.split('|').map((part) => part?.trim());
      if (!url) return null;
      return { url, source: source || new URL(url).hostname };
    })
    .filter((feed): feed is RssFeed => feed !== null);
}

/** Dominios que el modelo debe priorizar al buscar. */
export function getSearchDomains(): string[] {
  return parseList(process.env.NEWS_SEARCH_DOMAINS) ?? DEFAULT_SEARCH_DOMAINS;
}

/** Consultas con las que el modelo rastrea el sector. */
export function getSearchQueries(): string[] {
  return parseList(process.env.NEWS_SEARCH_QUERIES) ?? DEFAULT_SEARCH_QUERIES;
}
