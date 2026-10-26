/**
 * Fuentes de información del sector.
 *
 * Están juntas y en un solo lugar porque son lo primero que cambia al llevar el
 * agente a otra marca o a otro sector: feeds, dominios que el modelo debe
 * priorizar y consultas de búsqueda. Se pueden sustituir por configuración, sin
 * tocar el código que las usa (HU-13, RNF-10).
 *
 * Los valores por defecto son los de la marca de ejemplo —una empresa de
 * software B2B—, así que apuntan a medios de tecnología en español.
 */

export type RssFeed = { url: string; source: string };

export const DEFAULT_RSS_FEEDS: RssFeed[] = [
  { url: 'https://www.xataka.com.mx/feedburner.xml', source: 'Xataka México' },
  { url: 'https://hipertextual.com/feed', source: 'Hipertextual' },
  { url: 'https://www.genbeta.com/feedburner.xml', source: 'Genbeta' },
  { url: 'https://www.wwwhatsnew.com/feed/', source: 'WWWhat’s new' },
  { url: 'https://www.muycomputerpro.com/feed', source: 'MuyComputerPro' },
  { url: 'https://blog.desdelinux.net/feed/', source: 'DesdeLinux' },
];

export const DEFAULT_SEARCH_DOMAINS = [
  'xataka.com.mx',
  'hipertextual.com',
  'muycomputerpro.com',
  'eleconomista.com.mx',
];

export const DEFAULT_SEARCH_QUERIES = [
  'inteligencia artificial empresas',
  'plataformas de datos empresas',
  'computo en la nube noticias',
  'ciberseguridad empresas Latinoamérica',
  'regulación de datos personales Latinoamérica',
  'talento tecnológico Latinoamérica',
  'software B2B inversión',
  'automatización de procesos empresas',
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
