import { describe, expect, it } from 'vitest';
import { demoResponseFor, streamDemoResponse } from '@/lib/demo-agent';
import { DEMO_BRAND } from '@/lib/brand';
import { parseAngle, parsePost, parseTopics, parseVersionContent, parseVersions } from '@/lib/post-parser';

/**
 * El guion de demostración no sirve de nada si la interfaz no lo entiende: estas
 * pruebas lo pasan por los mismos parsers que el modelo real, que es la forma de
 * garantizar que el recorrido de la demo se ve como el de verdad (HU-12).
 */

const brand = DEMO_BRAND;

describe('demoResponseFor', () => {
  const fecha = new Date('2026-10-24T18:00:00Z');

  it('la lista de temas la entiende el parser de temas', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'empecemos' }], brand, fecha);
    const parsed = parseTopics(texto);

    expect(parsed).not.toBeNull();
    expect(parsed?.topics).toHaveLength(5);
    expect(parsed?.closingText).toContain('Escribe el número');
  });

  it('la lista mezcla actualidad y temas de fondo', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'empecemos' }], brand, fecha);
    const topics = parseTopics(texto)?.topics ?? [];

    expect(topics.some((t) => t.kind === 'Actualidad')).toBe(true);
    expect(topics.some((t) => t.kind === 'Tema')).toBe(true);
  });

  it('las noticias de ejemplo llevan fecha de hoy o de ayer', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'empecemos' }], brand, fecha);

    expect(texto).toContain('24 de octubre de 2026');
    expect(texto).toContain('23 de octubre de 2026');
  });

  it('los enlaces de ejemplo no se hacen pasar por medios reales', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'empecemos' }], brand, fecha);
    const urls = parseTopics(texto)?.topics.map((t) => t.url).filter(Boolean) ?? [];

    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(url).toMatch(/\.example\//);
  });

  it('el ángulo lo entiende el parser de ángulo', () => {
    const texto = demoResponseFor([{ role: 'user', content: '1' }], brand, fecha);
    const angulo = parseAngle(texto);

    expect(angulo?.angulo).toBeTruthy();
    expect(angulo?.porQueAhora).toBeTruthy();
    expect(angulo?.emocion).toBeTruthy();
  });

  it('las versiones A/B las entiende el parser de versiones', () => {
    const texto = demoResponseFor([{ role: 'user', content: '📝 Copy' }], brand, fecha);
    const versiones = parseVersions(texto);

    expect(versiones?.format).toBe('Copy');
    expect(versiones?.versionA.titulares).toHaveLength(3);
    expect(versiones?.versionB.titulares).toHaveLength(3);
  });

  it('las dos versiones proponen ganchos distintos, no la misma idea', () => {
    const versiones = parseVersions(demoResponseFor([{ role: 'user', content: 'Copy' }], brand, fecha));

    expect(versiones?.versionA.titulo).not.toBe(versiones?.versionB.titulo);
    expect(versiones?.versionA.contenido).not.toBe(versiones?.versionB.contenido);
  });

  it('en Copy + imagen añade copy y prompt de imagen', () => {
    const texto = demoResponseFor([{ role: 'user', content: '📸 Copy + imagen' }], brand, fecha);
    const versiones = parseVersions(texto);
    const contenido = parseVersionContent(versiones?.versionA.contenido ?? '');

    expect(versiones?.format).toBe('Copy + imagen');
    expect(contenido.copyImagen).toBeTruthy();
    expect(contenido.promptImagen).toBeTruthy();
  });

  it('en Copy no inventa secciones de imagen', () => {
    const versiones = parseVersions(demoResponseFor([{ role: 'user', content: 'Copy' }], brand, fecha));
    const contenido = parseVersionContent(versiones?.versionA.contenido ?? '');

    expect(contenido.copyImagen).toBeUndefined();
    expect(contenido.hashtags.length).toBeGreaterThan(0);
  });

  it('al confirmar una versión responde corto y sin repetir el contenido', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'Elijo la Versión A' }], brand, fecha);

    expect(texto.length).toBeLessThan(200);
    expect(parseVersions(texto)).toBeNull();
  });

  it('un ajuste devuelve un bloque de post que el parser entiende', () => {
    const texto = demoResponseFor([{ role: 'user', content: 'hazlo más corto' }], brand, fecha);
    const post = parsePost(texto);

    expect(post?.titular).toBeTruthy();
    expect(post?.cuerpo).toBeTruthy();
    expect(post?.hashtags).toContain('#');
  });

  it('se fija en el último mensaje del analista, no en el primero', () => {
    const texto = demoResponseFor(
      [
        { role: 'user', content: 'empecemos' },
        { role: 'assistant', content: 'lista de temas' },
        { role: 'user', content: '2' },
      ],
      brand,
      fecha
    );

    expect(parseAngle(texto)).not.toBeNull();
  });

  it('sin mensajes del analista propone temas', () => {
    expect(parseTopics(demoResponseFor([], brand, fecha))).not.toBeNull();
  });
});

describe('streamDemoResponse', () => {
  it('entrega el texto completo, por trozos', async () => {
    const trozos: string[] = [];
    const texto = 'abcdefghij';

    const resultado = await streamDemoResponse(texto, (chunk) => trozos.push(chunk), { chunkSize: 3 });

    expect(resultado).toBe(texto);
    expect(trozos).toEqual(['abc', 'def', 'ghi', 'j']);
    expect(trozos.join('')).toBe(texto);
  });

  it('no emite nada para un texto vacío', async () => {
    const trozos: string[] = [];
    await streamDemoResponse('', (chunk) => trozos.push(chunk));
    expect(trozos).toEqual([]);
  });

  it('respeta la pausa entre trozos', async () => {
    const inicio = Date.now();
    await streamDemoResponse('abcdef', () => {}, { chunkSize: 2, delayMs: 5 });
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(10);
  });
});
