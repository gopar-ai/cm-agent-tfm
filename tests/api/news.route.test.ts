import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { NewsItem } from '@/lib/news-types';

/**
 * Pruebas de las rutas del feed: la que consulta el panel y la que refresca por
 * tarea programada. El acceso a la red y al disco va con dobles.
 */

let sesion: { username: string } | null = { username: 'analista' };

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/auth', () => ({ getSession: async () => sesion }));

const fetchNews = vi.fn<() => Promise<NewsItem[]>>();
const getCachedNews = vi.fn<() => NewsItem[] | null>();
const setCachedNews = vi.fn<(items: NewsItem[]) => boolean>();

vi.mock('@/lib/news', () => ({ fetchNews }));
vi.mock('@/lib/news-cache', () => ({ getCachedNews, setCachedNews }));

const noticia: NewsItem = {
  title: 'Una noticia',
  url: 'https://medio.example/nota',
  source: 'Medio',
  date: '2026-10-24',
};

async function cargarRutaFeed() {
  vi.resetModules();
  fetchNews.mockReset();
  getCachedNews.mockReset();
  setCachedNews.mockReset().mockReturnValue(true);

  process.env.JWT_SECRET = 'x'.repeat(40);
  const { resetServerEnvCache } = await import('@/lib/env');
  resetServerEnvCache();

  return (await import('@/app/api/news/route')).GET;
}

async function cargarRutaCron(env: Record<string, string> = {}) {
  vi.resetModules();
  fetchNews.mockReset();
  setCachedNews.mockReset().mockReturnValue(true);

  delete process.env.CRON_SECRET;
  for (const [clave, valor] of Object.entries(env)) process.env[clave] = valor;

  const { resetServerEnvCache } = await import('@/lib/env');
  resetServerEnvCache();

  return (await import('@/app/api/cron/refresh-news/route')).GET;
}

afterEach(() => {
  sesion = { username: 'analista' };
  delete process.env.CRON_SECRET;
  delete process.env.JWT_SECRET;
});

describe('GET /api/news (HU-11)', () => {
  it('sin sesión responde 401 y no busca noticias', async () => {
    const GET = await cargarRutaFeed();
    sesion = null;

    const res = await GET();

    expect(res.status).toBe(401);
    expect(fetchNews).not.toHaveBeenCalled();
  });

  it('busca el feed cuando no hay nada en caché', async () => {
    const GET = await cargarRutaFeed();
    getCachedNews.mockReturnValue(null);
    fetchNews.mockResolvedValue([noticia]);

    const res = await GET();

    expect(res.headers.get('X-Cache')).toBe('MISS');
    await expect(res.json()).resolves.toEqual({ news: [noticia] });
    expect(setCachedNews).toHaveBeenCalledWith([noticia]);
  });

  it('usa la caché de disco antes de buscar', async () => {
    const GET = await cargarRutaFeed();
    getCachedNews.mockReturnValue([noticia]);

    const res = await GET();

    expect(res.headers.get('X-Cache')).toBe('HIT-disco');
    expect(fetchNews).not.toHaveBeenCalled();
  });

  it('la segunda petición ya se sirve de memoria, sin tocar el disco', async () => {
    const GET = await cargarRutaFeed();
    getCachedNews.mockReturnValue(null);
    fetchNews.mockResolvedValue([noticia]);

    await (await GET()).json();
    getCachedNews.mockClear();

    const segunda = await GET();

    expect(segunda.headers.get('X-Cache')).toBe('HIT-memoria');
    expect(getCachedNews).not.toHaveBeenCalled();
    expect(fetchNews).toHaveBeenCalledTimes(1);
  });

  it('si el feed falla devuelve una lista vacía en vez de romper el panel', async () => {
    const GET = await cargarRutaFeed();
    getCachedNews.mockReturnValue(null);
    fetchNews.mockRejectedValue(new Error('sin red'));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Cache')).toBe('ERROR');
    await expect(res.json()).resolves.toEqual({ news: [] });
  });
});

describe('GET /api/cron/refresh-news (OWASP A01)', () => {
  function peticion(authorization?: string) {
    return new NextRequest('http://localhost/api/cron/refresh-news', {
      headers: authorization ? { authorization } : {},
    });
  }

  it('queda deshabilitada si no se configuró el secreto', async () => {
    const GET = await cargarRutaCron();

    const res = await GET(peticion('Bearer lo-que-sea'));

    expect(res.status).toBe(503);
    expect(fetchNews).not.toHaveBeenCalled();
  });

  it('rechaza una petición sin credencial', async () => {
    const GET = await cargarRutaCron({ CRON_SECRET: 'secreto-suficientemente-largo' });

    expect((await GET(peticion())).status).toBe(401);
    expect(fetchNews).not.toHaveBeenCalled();
  });

  it('rechaza un secreto equivocado', async () => {
    const GET = await cargarRutaCron({ CRON_SECRET: 'secreto-suficientemente-largo' });

    expect((await GET(peticion('Bearer otro-secreto'))).status).toBe(401);
  });

  it('refresca el feed con el secreto correcto', async () => {
    const GET = await cargarRutaCron({ CRON_SECRET: 'secreto-suficientemente-largo' });
    fetchNews.mockResolvedValue([noticia]);

    const res = await GET(peticion('Bearer secreto-suficientemente-largo'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, count: 1, persisted: true });
  });

  it('avisa cuando la caché no se pudo guardar en disco', async () => {
    const GET = await cargarRutaCron({ CRON_SECRET: 'secreto-suficientemente-largo' });
    fetchNews.mockResolvedValue([noticia]);
    setCachedNews.mockReturnValue(false);

    const res = await GET(peticion('Bearer secreto-suficientemente-largo'));

    await expect(res.json()).resolves.toMatchObject({ ok: true, persisted: false });
  });

  it('responde 502 si la búsqueda falla', async () => {
    const GET = await cargarRutaCron({ CRON_SECRET: 'secreto-suficientemente-largo' });
    fetchNews.mockRejectedValue(new Error('sin red'));

    const res = await GET(peticion('Bearer secreto-suficientemente-largo'));

    expect(res.status).toBe(502);
  });
});
