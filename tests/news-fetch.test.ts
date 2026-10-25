import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NewsItem } from '@/lib/news-types';

/**
 * Lo que toca disco y red: la caché en disco, la lectura de los feeds y el
 * armado del feed completo. Todo con dobles y con un directorio temporal, para
 * que la suite no dependa de internet ni deje basura.
 */

const noticia: NewsItem = {
  title: 'Una noticia',
  url: 'https://medio.example/nota',
  source: 'Medio',
  date: '2026-10-24',
};

function directorioTemporal(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cm-agent-cache-'));
}

afterEach(() => {
  delete process.env.NEWS_CACHE_DIR;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.NEWS_RSS_FEEDS;
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('caché del feed en disco', () => {
  async function cargarCache(dir: string) {
    vi.resetModules();
    process.env.NEWS_CACHE_DIR = dir;
    return import('@/lib/news-cache');
  }

  it('guarda y recupera el feed del día', async () => {
    const dir = directorioTemporal();
    const { getCachedNews, setCachedNews } = await cargarCache(dir);

    expect(setCachedNews([noticia])).toBe(true);
    expect(getCachedNews()).toEqual([noticia]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('crea el directorio si no existe', async () => {
    const dir = path.join(directorioTemporal(), 'sub', 'carpeta');
    const { setCachedNews } = await cargarCache(dir);

    expect(setCachedNews([noticia])).toBe(true);
    expect(fs.existsSync(path.join(dir, 'news-cache.json'))).toBe(true);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('no sirve la caché de otro día', async () => {
    const dir = directorioTemporal();
    const { getCachedNews, setCachedNews } = await cargarCache(dir);

    setCachedNews([noticia], new Date('2026-10-20T18:00:00Z'));

    expect(getCachedNews(new Date('2026-10-21T18:00:00Z'))).toBeNull();
    expect(getCachedNews(new Date('2026-10-20T18:00:00Z'))).toEqual([noticia]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('sin archivo devuelve null', async () => {
    const { getCachedNews } = await cargarCache(directorioTemporal());
    expect(getCachedNews()).toBeNull();
  });

  it('con un archivo corrupto devuelve null en vez de lanzar', async () => {
    const dir = directorioTemporal();
    const { getCachedNews } = await cargarCache(dir);

    fs.writeFileSync(path.join(dir, 'news-cache.json'), 'no es json');
    expect(getCachedNews()).toBeNull();

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('con un archivo de forma inesperada devuelve null', async () => {
    const dir = directorioTemporal();
    const { getCachedNews } = await cargarCache(dir);

    fs.writeFileSync(path.join(dir, 'news-cache.json'), JSON.stringify({ date: '2026-10-24' }));
    expect(getCachedNews(new Date('2026-10-24T18:00:00Z'))).toBeNull();

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('si el disco es de solo lectura avisa y no rompe la petición', async () => {
    // Es lo que pasa en un contenedor con el sistema de archivos protegido:
    // antes esto lanzaba y se llevaba por delante la petición entera.
    const dir = directorioTemporal();
    const { setCachedNews } = await cargarCache(dir);

    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('EROFS: read-only file system');
    });

    expect(setCachedNews([noticia])).toBe(false);

    vi.mocked(fs.writeFileSync).mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('fetchRssNews', () => {
  const xml = `<rss><channel><item>
      <title>Noticia del feed</title>
      <link>https://medio.example/feed-uno</link>
      <pubDate>Fri, 24 Oct 2026 10:00:00 +0000</pubDate>
    </item></channel></rss>`;

  it('junta las noticias de todos los feeds configurados', async () => {
    process.env.NEWS_RSS_FEEDS = 'https://uno.example/feed|Uno, https://dos.example/feed|Dos';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => xml }));

    const { fetchRssNews } = await import('@/lib/news-rss');
    const items = await fetchRssNews();

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.source)).toEqual(['Uno', 'Dos']);
  });

  it('un feed caído no tumba a los demás', async () => {
    process.env.NEWS_RSS_FEEDS = 'https://uno.example/feed|Uno, https://dos.example/feed|Dos';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => xml })
      .mockRejectedValueOnce(new Error('sin red'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchRssNews } = await import('@/lib/news-rss');
    const items = await fetchRssNews();

    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('Uno');
  });

  it('un feed que responde con error se ignora', async () => {
    process.env.NEWS_RSS_FEEDS = 'https://uno.example/feed|Uno';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));

    const { fetchRssNews } = await import('@/lib/news-rss');
    await expect(fetchRssNews()).resolves.toEqual([]);
  });
});

describe('fetchNews', () => {
  it('en modo de demostración devuelve el feed de ejemplo, sin red', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.resetModules();

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { fetchNews } = await import('@/lib/news');
    const { DEMO_NEWS } = await import('@/lib/news-demo');

    await expect(fetchNews()).resolves.toEqual(DEMO_NEWS);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('con clave de API junta feeds y búsqueda, sin repetir noticias', async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-falsa';

    vi.doMock('@/lib/news-rss', () => ({
      fetchRssNews: async () => [noticia, { ...noticia, url: 'https://medio.example/dos' }],
    }));

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: async () => ({
            content: [
              {
                type: 'text',
                text: JSON.stringify([
                  // Repetida respecto al RSS: debe quedar una sola.
                  { title: 'Una noticia', url: 'https://medio.example/nota', source: 'Medio', date: '2026-10-24' },
                  { title: 'Del modelo', url: 'https://medio.example/tres', source: 'Medio', date: '2026-10-25' },
                ]),
              },
            ],
          }),
        };
      },
    }));

    // Sin portadas: evita salir a la red por las imágenes.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { fetchNews } = await import('@/lib/news');
    const items = await fetchNews();

    expect(items).toHaveLength(3);
    expect(new Set(items.map((i) => i.url)).size).toBe(3);
    // Lo más reciente primero.
    expect(items[0].url).toBe('https://medio.example/tres');

    vi.doUnmock('@/lib/news-rss');
    vi.doUnmock('@anthropic-ai/sdk');
  });

  it('si la búsqueda del modelo falla, el feed sigue con lo que dan los RSS', async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-falsa';

    vi.doMock('@/lib/news-rss', () => ({ fetchRssNews: async () => [noticia] }));
    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: async () => {
            throw new Error('modelo caído');
          },
        };
      },
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { fetchNews } = await import('@/lib/news');
    const items = await fetchNews();

    expect(items).toHaveLength(1);

    vi.doUnmock('@/lib/news-rss');
    vi.doUnmock('@anthropic-ai/sdk');
  });
});

describe('streamChatWithAgent', () => {
  it('entrega los trozos y devuelve el texto completo', async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-falsa';

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          stream: () => ({
            on(evento: string, callback: (delta: string) => void) {
              if (evento === 'text') {
                callback('Hola ');
                callback('mundo');
              }
              return this;
            },
            finalMessage: async () => ({ content: [{ type: 'text', text: 'Hola mundo' }] }),
          }),
        };
      },
    }));

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { streamChatWithAgent } = await import('@/lib/anthropic');

    const trozos: string[] = [];
    const texto = await streamChatWithAgent(
      [{ role: 'user', content: 'hola' }],
      (chunk) => trozos.push(chunk)
    );

    expect(trozos).toEqual(['Hola ', 'mundo']);
    expect(texto).toBe('Hola mundo');

    vi.doUnmock('@anthropic-ai/sdk');
  });

  it('falla con un mensaje claro si el modelo no devuelve texto', async () => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'sk-ant-falsa';

    vi.doMock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          stream: () => ({
            on() {
              return this;
            },
            finalMessage: async () => ({ content: [] }),
          }),
        };
      },
    }));

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { streamChatWithAgent } = await import('@/lib/anthropic');

    await expect(
      streamChatWithAgent([{ role: 'user', content: 'hola' }], () => {})
    ).rejects.toThrow(/Respuesta inesperada/);

    vi.doUnmock('@anthropic-ai/sdk');
  });

  it('sin clave configurada explica que falta la clave', async () => {
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;

    const { resetServerEnvCache } = await import('@/lib/env');
    resetServerEnvCache();

    const { streamChatWithAgent, resetAnthropicClient } = await import('@/lib/anthropic');
    resetAnthropicClient();

    await expect(
      streamChatWithAgent([{ role: 'user', content: 'hola' }], () => {})
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
