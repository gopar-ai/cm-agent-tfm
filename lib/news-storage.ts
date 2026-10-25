import type { NewsItem } from './news-types';

const SAVED_NEWS_KEY = 'cm_saved_news';

export function getSavedNews(): NewsItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_NEWS_KEY);
    return raw ? (JSON.parse(raw) as NewsItem[]) : [];
  } catch {
    return [];
  }
}

export function saveNews(item: NewsItem): void {
  const saved = getSavedNews();
  if (saved.some((n) => n.url === item.url)) return;
  localStorage.setItem(SAVED_NEWS_KEY, JSON.stringify([item, ...saved]));
}

export function removeSavedNews(url: string): void {
  const saved = getSavedNews().filter((n) => n.url !== url);
  localStorage.setItem(SAVED_NEWS_KEY, JSON.stringify(saved));
}

export function isNewsSaved(url: string): boolean {
  return getSavedNews().some((n) => n.url === url);
}
