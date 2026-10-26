import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildNewsSystemPrompt,
  dedupeByUrl,
  extractJsonArray,
  fetchOgImage,
  normalizeNewsItems,
  sortByDateDesc,
} from '@/lib/news';
import { decodeEntities, parseFeedXml, toIsoDate } from '@/lib/news-rss';
import {
  DEFAULT_SEARCH_DOMAINS,
  getRssFeeds,
  getSearchDomains,
  getSearchQueries,
} from '@/lib/news-sources';

afterEach(() => {
  delete process.env.NEWS_RSS_FEEDS;
  delete process.env.NEWS_SEARCH_DOMAINS;
  delete process.env.NEWS_SEARCH_QUERIES;
  vi.unstubAllGlobals();
});

describe('extractJsonArray', () => {
  it('extrae un array limpio', () => {
    expect(extractJsonArray('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('extrae el array aunque venga con texto alrededor', () => {
    // El modelo a veces añade una frase antes del JSON, pese a lo que se le pide.
    expect(extractJsonArray('Aquí va: [{"a":1}] listo')).toEqual([{ a: 1 }]);
  });

  it('extrae el array dentro de un bloque de código', () => {
    expect(extractJsonArray('```json\n[1,2]\n```')).toEqual([1, 2]);
  });

  it('devuelve lista vacía si no hay array', () => {
    expect(extractJsonArray('no hay nada')).toEqual([]);
    expect(extractJsonArray('')).toEqual([]);
  });

  it('devuelve lista vacía si el JSON está roto', () => {
    expect(extractJsonArray('[{"a":}]')).toEqual([]);
  });

  it('rescata el array aunque el modelo lo envuelva en un objeto', () => {
    // Busca del primer "[" al último "]": si la respuesta viene envuelta, el
    // array interior se recupera igual en vez de perder el feed entero.
    expect(extractJsonArray('{"items":[1]}')).toEqual([1]);
  });

  it('devuelve lista vacía si lo que hay entre corchetes no es JSON válido', () => {
    expect(extractJsonArray('{"items":[1,}')).toEqual([]);
  });
});

describe('normalizeNewsItems', () => {
  const noticia = {
    title: '  Una noticia  ',
    url: ' https://medio.example/nota ',
    source: ' Medio ',
    date: ' 2026-10-24 ',
  };

  it('recorta los espacios de todos los campos', () => {
    expect(normalizeNewsItems([noticia])[0]).toEqual({
      title: 'Una noticia',
      url: 'https://medio.example/nota',
      source: 'Medio',
      date: '2026-10-24',
    });
  });

  it('descarta lo que no tiene forma de noticia', () => {
    expect(normalizeNewsItems([null, 'texto', 42, {}, { title: 'solo título' }])).toEqual([]);
  });

  it('acepta una noticia sin fecha', () => {
    const items = normalizeNewsItems([{ ...noticia, date: undefined }]);
    expect(items[0].date).toBe('');
  });

  it('descarta URLs que no son públicas (SSRF)', () => {
    const items = normalizeNewsItems([
      { ...noticia, url: 'http://169.254.169.254/latest/meta-data/' },
      { ...noticia, url: 'file:///etc/passwd' },
      { ...noticia, url: 'http://localhost/admin' },
    ]);

    expect(items).toEqual([]);
  });

  it('descarta una noticia sin título', () => {
    expect(normalizeNewsItems([{ ...noticia, title: '   ' }])).toEqual([]);
  });
});

describe('sortByDateDesc', () => {
  it('pone lo más reciente primero', () => {
    const ordenadas = sortByDateDesc([
      { title: 'vieja', url: 'u1', source: 's', date: '2026-01-01' },
      { title: 'nueva', url: 'u2', source: 's', date: '2026-10-24' },
    ]);

    expect(ordenadas[0].title).toBe('nueva');
  });

  it('manda al final las que no tienen fecha', () => {
    const ordenadas = sortByDateDesc([
      { title: 'sin fecha', url: 'u1', source: 's', date: '' },
      { title: 'con fecha', url: 'u2', source: 's', date: '2026-10-24' },
    ]);

    expect(ordenadas.map((n) => n.title)).toEqual(['con fecha', 'sin fecha']);
  });

  it('no altera el arreglo original', () => {
    const original = [
      { title: 'a', url: 'u1', source: 's', date: '2026-01-01' },
      { title: 'b', url: 'u2', source: 's', date: '2026-10-01' },
    ];
    sortByDateDesc(original);

    expect(original[0].title).toBe('a');
  });

  it('deja igual dos noticias sin fecha', () => {
    const items = [
      { title: 'a', url: 'u1', source: 's', date: '' },
      { title: 'b', url: 'u2', source: 's', date: '' },
    ];
    expect(sortByDateDesc(items).map((n) => n.title)).toEqual(['a', 'b']);
  });
});

describe('dedupeByUrl', () => {
  it('se queda con la primera aparición de cada URL', () => {
    const items = [
      { title: 'primera', url: 'https://a.example/x', source: 's', date: '' },
      { title: 'repetida', url: 'https://a.example/x', source: 's', date: '' },
      { title: 'otra', url: 'https://b.example/y', source: 's', date: '' },
    ];

    const unicas = dedupeByUrl(items);
    expect(unicas).toHaveLength(2);
    expect(unicas[0].title).toBe('primera');
  });

  it('descarta las que no tienen URL', () => {
    expect(dedupeByUrl([{ title: 'a', url: '', source: 's', date: '' }])).toEqual([]);
  });
});

describe('fetchOgImage (OWASP A10)', () => {
  it('no pide nada si la URL no es pública', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await fetchOgImage('http://169.254.169.254/latest/meta-data/')).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('devuelve la imagen declarada en og:image', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<html><meta property="og:image" content="https://medio.example/foto.jpg"></html>',
      })
    );

    expect(await fetchOgImage('https://medio.example/nota')).toBe('https://medio.example/foto.jpg');
  });

  it('acepta el orden inverso de los atributos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          '<meta content="https://medio.example/foto.png" property="og:image">',
      })
    );

    expect(await fetchOgImage('https://medio.example/nota')).toBe('https://medio.example/foto.png');
  });

  it('descarta una imagen que apunta a la red interna', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '<meta property="og:image" content="http://10.0.0.1/interna.jpg">',
      })
    );

    expect(await fetchOgImage('https://medio.example/nota')).toBeUndefined();
  });

  it('devuelve undefined si la página no responde bien', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => '' }));
    expect(await fetchOgImage('https://medio.example/nota')).toBeUndefined();
  });

  it('devuelve undefined si no hay og:image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '<html></html>' }));
    expect(await fetchOgImage('https://medio.example/nota')).toBeUndefined();
  });

  it('devuelve undefined si la petición falla o se agota el tiempo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await fetchOgImage('https://medio.example/nota')).toBeUndefined();
  });

  it('no sigue redirecciones automáticamente', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchSpy);

    await fetchOgImage('https://medio.example/nota');

    // Un redirect podría llevar a una IP interna, saltándose la validación.
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
  });
});

describe('parseFeedXml', () => {
  const xml = `<rss><channel>
    <item>
      <title><![CDATA[Noticia con CDATA]]></title>
      <link>https://medio.example/uno</link>
      <pubDate>Fri, 24 Oct 2026 10:00:00 +0000</pubDate>
    </item>
    <item>
      <title>Noticia con &amp; entidades</title>
      <link>https://medio.example/dos</link>
      <pubDate>fecha inválida</pubDate>
    </item>
  </channel></rss>`;

  it('extrae las noticias con su fuente', () => {
    const items = parseFeedXml(xml, 'Medio Ejemplo');

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Noticia con CDATA');
    expect(items[0].source).toBe('Medio Ejemplo');
  });

  it('convierte la fecha a formato ISO', () => {
    expect(parseFeedXml(xml, 'Medio')[0].date).toBe('2026-10-24');
  });

  it('deja la fecha vacía si no se puede interpretar', () => {
    expect(parseFeedXml(xml, 'Medio')[1].date).toBe('');
  });

  it('decodifica las entidades del título', () => {
    expect(parseFeedXml(xml, 'Medio')[1].title).toBe('Noticia con & entidades');
  });

  it('descarta items sin título o sin enlace', () => {
    const incompleto = '<item><title>Sin enlace</title></item><item><link>https://a.example/x</link></item>';
    expect(parseFeedXml(incompleto, 'Medio')).toEqual([]);
  });

  it('descarta enlaces que no son públicos', () => {
    const malicioso = '<item><title>Trampa</title><link>http://127.0.0.1/admin</link></item>';
    expect(parseFeedXml(malicioso, 'Medio')).toEqual([]);
  });

  it('devuelve lista vacía para un XML sin items', () => {
    expect(parseFeedXml('<rss></rss>', 'Medio')).toEqual([]);
  });

  it('toma como máximo diez noticias por feed', () => {
    const muchos = Array.from(
      { length: 15 },
      (_, i) => `<item><title>N${i}</title><link>https://medio.example/${i}</link></item>`
    ).join('');

    expect(parseFeedXml(muchos, 'Medio')).toHaveLength(10);
  });
});

describe('decodeEntities y toIsoDate', () => {
  it('decodifica entidades numéricas y con nombre', () => {
    expect(decodeEntities('&#8364; &#x20AC; &lt;a&gt; &quot;x&quot; &#39;y&#39; &nbsp;')).toBe(
      '€ € <a> "x" \'y\'  '
    );
  });

  it('decodifica &amp; al final, para no romper otras entidades', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });

  it('toIsoDate deja vacío lo que no es fecha', () => {
    expect(toIsoDate('')).toBe('');
    expect(toIsoDate('cuando sea')).toBe('');
  });
});

describe('news-sources', () => {
  it('trae las fuentes por defecto', () => {
    expect(getRssFeeds().length).toBeGreaterThan(0);
    expect(getSearchDomains().length).toBeGreaterThan(0);
    expect(getSearchQueries().length).toBeGreaterThan(0);
  });

  it('toma los feeds de la configuración, con nombre opcional', () => {
    process.env.NEWS_RSS_FEEDS = 'https://uno.example/feed|Uno, https://dos.example/feed';
    const feeds = getRssFeeds();

    expect(feeds).toHaveLength(2);
    expect(feeds[0]).toEqual({ url: 'https://uno.example/feed', source: 'Uno' });
    // Sin nombre, se usa el dominio.
    expect(feeds[1].source).toBe('dos.example');
  });

  it('ignora una configuración vacía y vuelve a los valores por defecto', () => {
    process.env.NEWS_SEARCH_DOMAINS = '   ';
    expect(getSearchDomains()).toEqual(DEFAULT_SEARCH_DOMAINS);
  });

  it('toma dominios y consultas de la configuración', () => {
    process.env.NEWS_SEARCH_DOMAINS = 'medio.example, otro.example';
    process.env.NEWS_SEARCH_QUERIES = 'retail colombia, moda bogotá';

    expect(getSearchDomains()).toEqual(['medio.example', 'otro.example']);
    expect(getSearchQueries()).toEqual(['retail colombia', 'moda bogotá']);
  });
});

describe('buildNewsSystemPrompt', () => {
  it('incluye los dominios y las consultas activas', () => {
    process.env.NEWS_SEARCH_DOMAINS = 'medio.example';
    process.env.NEWS_SEARCH_QUERIES = 'consulta de prueba';

    const prompt = buildNewsSystemPrompt();

    expect(prompt).toContain('medio.example');
    expect(prompt).toContain('consulta de prueba');
  });

  it('pide el formato JSON exacto y prohíbe inventar fechas', () => {
    const prompt = buildNewsSystemPrompt();

    expect(prompt).toContain('JSON array');
    expect(prompt).toContain('nunca inventes una fecha');
  });
});
