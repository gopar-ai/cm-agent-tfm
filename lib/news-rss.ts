import type { NewsItem } from './news-types';
import { getRssFeeds, type RssFeed } from './news-sources';
import { isSafePublicHttpUrl } from './security';

/**
 * Lectura de los feeds RSS del sector.
 *
 * Se parsea el XML con expresiones regulares a propósito: son feeds RSS 2.0 con
 * una estructura fija y conocida, y evita sumar una dependencia de parseo para
 * extraer cuatro campos. El límite está asumido y anotado en docs/03-diseno.md.
 */

const FEED_TIMEOUT_MS = 6000;
const ITEMS_PER_FEED = 10;

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function extractTag(block: string, tag: string): string {
  const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return plainMatch ? decodeEntities(plainMatch[1].trim()) : '';
}

export function toIsoDate(pubDate: string): string {
  if (!pubDate) return '';
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

/** Convierte el XML de un feed en noticias. Pura: no toca la red. */
export function parseFeedXml(xml: string, source: string): NewsItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

  return items
    .slice(0, ITEMS_PER_FEED)
    .map((match) => {
      const block = match[1];
      return {
        title: extractTag(block, 'title'),
        url: extractTag(block, 'link'),
        source,
        date: toIsoDate(extractTag(block, 'pubDate')),
      };
    })
    .filter((item) => item.title && item.url && isSafePublicHttpUrl(item.url));
}

async function fetchFeed(feed: RssFeed): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMAgentBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];

    return parseFeedXml(await res.text(), feed.source);
  } catch {
    // Un feed caído no debe tumbar el resto del panel.
    return [];
  }
}

export async function fetchRssNews(): Promise<NewsItem[]> {
  const results = await Promise.all(getRssFeeds().map(fetchFeed));
  return results.flat();
}
