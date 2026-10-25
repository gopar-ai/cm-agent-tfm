import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCachedNews, setCachedNews } from '@/lib/news-cache';
import { fetchNews } from '@/lib/news';
import type { NewsItem } from '@/lib/news-types';

/**
 * Feed de noticias, con dos niveles de caché: memoria del proceso y disco.
 *
 * El orden importa para el costo: memoria evita incluso leer el disco; el disco
 * sobrevive a un reinicio del contenedor, que en Railway pasa a diario.
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let memoryCache: { news: NewsItem[]; timestamp: number } | null = null;

/** Solo para pruebas: vacía la caché en memoria. */
export function resetNewsMemoryCache(): void {
  memoryCache = null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const now = Date.now();

  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ news: memoryCache.news }, { headers: { 'X-Cache': 'HIT-memoria' } });
  }

  const diskCached = getCachedNews();
  if (diskCached) {
    memoryCache = { news: diskCached, timestamp: now };
    return NextResponse.json({ news: diskCached }, { headers: { 'X-Cache': 'HIT-disco' } });
  }

  try {
    const news = await fetchNews();
    memoryCache = { news, timestamp: now };
    setCachedNews(news);
    return NextResponse.json({ news }, { headers: { 'X-Cache': 'MISS' } });
  } catch (error) {
    console.error('[noticias] no se pudo armar el feed:', error);
    // El feed es un acompañante del chat, no su requisito: mejor vacío que roto.
    return NextResponse.json({ news: [] }, { status: 200, headers: { 'X-Cache': 'ERROR' } });
  }
}
