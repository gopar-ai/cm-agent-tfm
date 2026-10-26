import Anthropic from '@anthropic-ai/sdk';
import { getServerEnv } from './env';
import { getSearchDomains, getSearchQueries } from './news-sources';
import { fetchRssNews } from './news-rss';
import { DEMO_NEWS } from './news-demo';
import { isSafePublicHttpUrl } from './security';
import type { NewsItem } from './news-types';

/**
 * Feed de noticias del sector.
 *
 * Dos fuentes que se complementan: los RSS, que son rápidos y gratuitos pero
 * limitados a los medios que publican feed; y una búsqueda web hecha por un
 * modelo pequeño (Haiku), que alcanza medios sin feed. Para extraer titulares y
 * fechas no hace falta el modelo grande, y la diferencia de costo es grande
 * (docs/07-trabajo-con-ia.md).
 */

const NEWS_MODEL = 'claude-haiku-4-5-20251001';
const MAX_ITEMS = 20;
const OG_IMAGE_TIMEOUT_MS = 5000;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const { anthropicApiKey } = getServerEnv();
    if (!anthropicApiKey) throw new Error('Falta ANTHROPIC_API_KEY para buscar noticias.');
    client = new Anthropic({ apiKey: anthropicApiKey });
  }
  return client;
}

/** Solo para pruebas. */
export function resetNewsClient(): void {
  client = null;
}

export function buildNewsSystemPrompt(): string {
  const domains = getSearchDomains().join(', ');
  const queries = getSearchQueries()
    .map((query) => `"${query}"`)
    .join(', ');

  return `Eres un buscador de noticias para un feed del sector.

Prioriza (no exclusivamente) estas fuentes: ${domains} — pero busca también en cualquier otro medio relevante.

Haz una búsqueda exhaustiva: usa MUCHAS variantes distintas antes de conformarte, por ejemplo: ${queries}. Prueba también agregando el mes y año actual a alguna de estas búsquedas para sesgar hacia resultados recientes.

Responde EXCLUSIVAMENTE con un JSON array, sin texto antes ni después, sin markdown, sin bloque de código. Cada elemento debe tener exactamente esta forma:
{"title": "string", "url": "string", "source": "string", "date": "YYYY-MM-DD"}

Reglas:
- Máximo ${MAX_ITEMS} elementos.
- "date" es la fecha de publicación real del artículo en formato YYYY-MM-DD. Si no puedes determinarla con certeza, usa "" (cadena vacía) — nunca inventes una fecha.
- "url" debe ser la URL directa del artículo, no la portada del sitio.
- "source" es el nombre del medio.
- No repitas la misma noticia dos veces.
- Da prioridad a noticias de los últimos 7 días sobre las más viejas: si encuentras al menos 10 de los últimos 7 días, usa esas antes de incluir noticias de hace semanas o meses.`;
}

/** Extrae el primer array JSON que aparezca en un texto. Pura y tolerante. */
export function extractJsonArray(text: string): unknown[] {
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

function isNewsItemShape(value: unknown): value is NewsItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === 'string' && typeof v.url === 'string' && typeof v.source === 'string';
}

/**
 * Normaliza lo que devolvió el modelo: se queda con lo que tiene forma de
 * noticia y descarta URLs que no sean públicas y seguras de pedir.
 */
export function normalizeNewsItems(raw: unknown[]): NewsItem[] {
  return raw
    .filter(isNewsItemShape)
    .map((item) => ({
      title: item.title.trim(),
      url: item.url.trim(),
      source: item.source.trim(),
      date: typeof item.date === 'string' ? item.date.trim() : '',
    }))
    .filter((item) => item.title && isSafePublicHttpUrl(item.url));
}

export function sortByDateDesc(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

export function dedupeByUrl(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function searchNews(): Promise<NewsItem[]> {
  const response = await getClient().messages.create({
    model: NEWS_MODEL,
    max_tokens: 4096,
    system: buildNewsSystemPrompt(),
    messages: [{ role: 'user', content: 'Busca las noticias y devuelve el JSON.' }],
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 18 }],
  });

  const text = response.content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .join('\n')
    .trim();

  return normalizeNewsItems(extractJsonArray(text));
}

/**
 * Pide la imagen de portada de una noticia.
 *
 * La URL la propuso el modelo o un feed de terceros, así que se valida antes de
 * pedirla: sin eso, el servidor se convierte en un proxy hacia su propia red
 * interna (SSRF, OWASP A10).
 */
export async function fetchOgImage(url: string): Promise<string | undefined> {
  if (!isSafePublicHttpUrl(url)) return undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_IMAGE_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual', // un redirect puede apuntar a una IP interna
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CMAgentBot/1.0)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;

    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    const image = match?.[1];
    return image && isSafePublicHttpUrl(image) ? image : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Feed completo: RSS + búsqueda del modelo, sin duplicados, lo más reciente
 * primero y con portada cuando se puede.
 *
 * En modo de demostración devuelve un feed de ejemplo: así la demo publicada no
 * depende de la red ni gasta llamadas al modelo.
 */
/**
 * Reparte las noticias entre las fuentes, una de cada una por vuelta.
 *
 * Sin esto, el feed lo copa el medio que más publica: las diez primeras eran
 * del mismo sitio, porque todas llevaban la fecha de hoy y el orden lo decidía
 * quién llegó antes. Alternar deja ver de entrada que hay varias fuentes.
 */
export function intercalarPorFuente(items: NewsItem[]): NewsItem[] {
  const porFuente = new Map<string, NewsItem[]>();
  for (const item of items) {
    const cola = porFuente.get(item.source) ?? [];
    cola.push(item);
    porFuente.set(item.source, cola);
  }

  const colas = [...porFuente.values()];
  const resultado: NewsItem[] = [];

  while (resultado.length < items.length) {
    for (const cola of colas) {
      const siguiente = cola.shift();
      if (siguiente) resultado.push(siguiente);
    }
  }

  return resultado;
}

/** Ordena, quita repetidas, reparte entre fuentes y busca la portada de cada una. */
async function componerFeed(items: NewsItem[]): Promise<NewsItem[]> {
  const ordenadas = intercalarPorFuente(sortByDateDesc(dedupeByUrl(items))).slice(0, MAX_ITEMS);
  return Promise.all(
    ordenadas.map(async (item) => ({ ...item, image: await fetchOgImage(item.url) }))
  );
}

export async function fetchNews(): Promise<NewsItem[]> {
  const { useDemoAgent } = getServerEnv();

  if (useDemoAgent) {
    // En demostración el feed también trae noticias **reales**: los RSS son
    // gratuitos y no necesitan clave, así que lo único que se omite es la
    // búsqueda con el modelo, que es la que cuesta. Si no hay red —o las
    // fuentes no responden— se cae al feed de ejemplo, para que el panel nunca
    // aparezca vacío.
    const reales = await componerFeed(await fetchRssNews().catch(() => [] as NewsItem[]));
    return reales.length > 0 ? reales : DEMO_NEWS;
  }

  const [rssItems, aiItems] = await Promise.all([
    fetchRssNews().catch(() => [] as NewsItem[]),
    searchNews().catch(() => [] as NewsItem[]),
  ]);

  return componerFeed([...rssItems, ...aiItems]);
}

export { NEWS_MODEL, MAX_ITEMS };
