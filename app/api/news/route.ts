import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fetchNews } from '@/lib/news';
import { getCachedNews, setCachedNews } from '@/lib/news-cache';
import type { NewsItem } from '@/lib/news-types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

let memoryCache: { news: NewsItem[]; timestamp: number } | null = null;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const now = Date.now();

  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ news: memoryCache.news }, { headers: { 'X-Cache': 'HIT' } });
  }

  const diskCached = getCachedNews();
  if (diskCached) {
    memoryCache = { news: diskCached, timestamp: now };
    return NextResponse.json({ news: diskCached }, { headers: { 'X-Cache': 'HIT' } });
  }

  const news = await fetchNews();
  memoryCache = { news, timestamp: now };
  setCachedNews(news);
  return NextResponse.json({ news }, { headers: { 'X-Cache': 'MISS' } });
}
