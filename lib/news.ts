import Anthropic from '@anthropic-ai/sdk';
import type { NewsItem } from './news-types';
import { fetchRssNews } from './news-rss';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NEWS_SYSTEM_PROMPT = `Eres un buscador de noticias para un feed de logística en México.

El tema es logística en general, no solo seguridad/robo de carga. Incluye: transporte de carga, cadena de suministro, nearshoring, comercio exterior, aranceles y política comercial, infraestructura logística (puertos, carreteras, aduanas), regulación del autotransporte, y también seguridad/robo de carga como un subtema más (no el único).

Prioriza (no exclusivamente) estas fuentes: thelogisticsworld.com, elfinanciero.com.mx, eleconomista.com.mx — pero busca también en cualquier otro medio mexicano relevante.

Haz una búsqueda exhaustiva: usa MUCHAS variantes de búsqueda distintas antes de conformarte, por ejemplo: "logística México", "cadena de suministro México", "nearshoring México", "comercio exterior México", "transporte de carga México", "robo de carga México", "seguridad logística México", "CANACAR", "puertos México logística", "aranceles transporte México". Prueba también agregando el mes y año actual a alguna de estas búsquedas para sesgar hacia resultados recientes.

Responde EXCLUSIVAMENTE con un JSON array, sin texto antes ni después, sin markdown, sin bloque de código. Cada elemento debe tener exactamente esta forma:
{"title": "string", "url": "string", "source": "string", "date": "YYYY-MM-DD"}

Reglas:
- Máximo 20 elementos.
- "date" es la fecha de publicación real del artículo en formato YYYY-MM-DD. Si no puedes determinarla con certeza, usa "" (cadena vacía) — nunca inventes una fecha.
- "url" debe ser la URL directa del artículo, no la portada del sitio.
- "source" es el nombre del medio (ej. "El Financiero", "The Logistics World").
- No repitas la misma noticia dos veces.
- Da prioridad a noticias de los últimos 7 días sobre las más viejas: si encuentras suficientes (al menos 10) de los últimos 7 días, usa esas antes de incluir noticias de hace varias semanas o meses.`;

function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isNewsItem(value: unknown): value is NewsItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === 'string' && typeof v.url === 'string' && typeof v.source === 'string';
}

async function searchNews(): Promise<NewsItem[]> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: NEWS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: 'Busca las noticias y devuelve el JSON.' }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 18 }],
  });

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim();

  const raw = extractJsonArray(text);

  return raw.filter(isNewsItem).map((item) => ({
    title: item.title.trim(),
    url: item.url.trim(),
    source: item.source.trim(),
    date: typeof item.date === 'string' ? item.date.trim() : '',
  }));
}

function sortByDateDesc(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

function dedupeByUrl(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMAgentBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;

    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  const [rssItems, aiItems] = await Promise.all([fetchRssNews(), searchNews()]);

  const top = sortByDateDesc(dedupeByUrl([...rssItems, ...aiItems])).slice(0, 20);

  const enriched = await Promise.all(
    top.map(async (item) => ({
      ...item,
      image: await fetchOgImage(item.url),
    }))
  );

  return enriched;
}
