import { readJson, writeJson } from './local-store';
import type { NewsItem } from './news-types';

/** Noticias que el analista guardó para desarrollarlas después. */

const SAVED_NEWS_KEY = 'cm_saved_news';

export function getSavedNews(): NewsItem[] {
  const stored = readJson<NewsItem[]>(SAVED_NEWS_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveNews(item: NewsItem): void {
  const saved = getSavedNews();
  if (saved.some((n) => n.url === item.url)) return;
  writeJson(SAVED_NEWS_KEY, [item, ...saved]);
}

export function removeSavedNews(url: string): void {
  writeJson(
    SAVED_NEWS_KEY,
    getSavedNews().filter((n) => n.url !== url)
  );
}

export function isNewsSaved(url: string): boolean {
  return getSavedNews().some((n) => n.url === url);
}

export { SAVED_NEWS_KEY };
