import fs from 'fs';
import path from 'path';
import type { NewsItem } from './news-types';

const CACHE_PATH = path.join(process.cwd(), 'data', 'news-cache.json');

type Cache = { date: string; items: NewsItem[] };

function todayKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function getCachedNews(): NewsItem[] | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf8');
    const cache = JSON.parse(raw) as Cache;
    if (cache.date !== todayKey()) return null;
    return cache.items;
  } catch {
    return null;
  }
}

export function setCachedNews(items: NewsItem[]): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  const cache: Cache = { date: todayKey(), items };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
}
