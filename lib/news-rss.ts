import type { NewsItem } from './news-types';

const RSS_FEEDS: { url: string; source: string }[] = [
  { url: 'https://thelogisticsworld.com/feed/', source: 'The Logistics World' },
  { url: 'https://logisticapress.com/feed/', source: 'Logística Press' },
  { url: 'https://transporte.mx/feed/', source: 'Transporte.mx' },
  { url: 'https://esemanal.mx/feed/', source: 'eSemanal' },
  { url: 'https://t21.com.mx/feed/', source: 'T21' },
  { url: 'https://revistalogisticaytransporte.com/feed/', source: 'Revista Énfasis Logística' },
  { url: 'https://alianzaflotillera.com/feed/', source: 'Alianza Flotillera' },
  { url: 'https://mexicanist.com/?feed=rss2', source: 'Mexicanist' },
];

function decodeEntities(text: string): string {
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

function extractTag(block: string, tag: string): string {
  const cdataMatch = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return plainMatch ? decodeEntities(plainMatch[1].trim()) : '';
}

function toIsoDate(pubDate: string): string {
  if (!pubDate) return '';
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().split('T')[0];
}

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMAgentBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];

    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items
      .slice(0, 10)
      .map((m) => {
        const block = m[1];
        return {
          title: extractTag(block, 'title'),
          url: extractTag(block, 'link'),
          source: feed.source,
          date: toIsoDate(extractTag(block, 'pubDate')),
        };
      })
      .filter((item) => item.title && item.url);
  } catch {
    return [];
  }
}

export async function fetchRssNews(): Promise<NewsItem[]> {
  const results = await Promise.all(RSS_FEEDS.map(fetchFeed));
  return results.flat();
}
