import fs from 'fs';
import path from 'path';
import { dayKey } from './day-key';
import type { NewsItem } from './news-types';

/**
 * Caché en disco del feed de noticias, válida por día natural de México.
 *
 * Escribir en disco puede fallar: en contenedor con sistema de archivos de solo
 * lectura, o sin permisos sobre el volumen. Antes eso lanzaba y rompía la
 * petición; ahora se registra y la app sigue con la caché en memoria.
 */

type Cache = { date: string; items: NewsItem[] };

const CACHE_DIR = process.env.NEWS_CACHE_DIR || path.join(process.cwd(), 'data');
const CACHE_PATH = path.join(CACHE_DIR, 'news-cache.json');

export function getCachedNews(now: Date = new Date()): NewsItem[] | null {
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as Cache;
    if (!cache || cache.date !== dayKey(now)) return null;
    return Array.isArray(cache.items) ? cache.items : null;
  } catch {
    return null;
  }
}

/** Guarda la caché. Devuelve false si el disco no lo permite. */
export function setCachedNews(items: NewsItem[], now: Date = new Date()): boolean {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cache: Cache = { date: dayKey(now), items };
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
    return true;
  } catch (error) {
    console.warn('[noticias] no se pudo escribir la caché en disco:', (error as Error).message);
    return false;
  }
}

export { CACHE_PATH };
