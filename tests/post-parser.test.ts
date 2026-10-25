import { describe, expect, it } from 'vitest';
import {
  parseAngle,
  parsePost,
  parseTopics,
  parseVersionContent,
  parseVersions,
} from '@/lib/post-parser';

/**
 * El parser es el contrato entre lo que escribe el modelo y lo que dibuja la
 * interfaz: si falla, el analista ve un muro de texto en vez de tarjetas. Es la
 * pieza con más pruebas del proyecto por eso mismo (HU-04, HU-05).
 */

describe('parsePost', () => {
  const bloque = `Aquí va tu post:

---POST---
TITULAR: Tres rutas concentran la mitad del robo
CUERPO:
Primera línea del cuerpo.

Segunda línea del cuerpo.
HASHTAGS: #Seguridad #Carga
PROMPT_IMAGEN: Fondo oscuro con carretera
---FIN---`;

  it('extrae los cuatro campos', () => {
    const post = parsePost(bloque);

    expect(post).not.toBeNull();
    expect(post?.titular).toBe('Tres rutas concentran la mitad del robo');
    expect(post?.cuerpo).toContain('Primera línea del cuerpo.');
    expect(post?.cuerpo).toContain('Segunda línea del cuerpo.');
    expect(post?.hashtags).toBe('#Seguridad #Carga');
    expect(post?.promptImagen).toBe('Fondo oscuro con carretera');
  });

  it('devuelve null cuando no hay bloque de post', () => {
    expect(parsePost('un texto cualquiera')).toBeNull();
  });

  it('tolera un bloque sin prompt de imagen', () => {
    const post = parsePost('---POST---\nTITULAR: T\nCUERPO:\nC\nHASHTAGS: #a\n---FIN---');

    expect(post?.titular).toBe('T');
    expect(post?.promptImagen).toBe('');
  });

  it('devuelve campos vacíos, no null, si el bloque viene incompleto', () => {
    const post = parsePost('---POST---\n---FIN---');

    expect(post).not.toBeNull();
    expect(post?.titular).toBe('');
    expect(post?.cuerpo).toBe('');
  });
});

describe('parseTopics', () => {
  const lista = `1. 🚨 Primer tema de actualidad — Actualidad
Por qué importa hoy.
Fecha: 24 de octubre de 2026
Fuente: Reporte Carga
[ver noticia](https://reportecarga.example/uno)

2. 📦 Segundo tema de fondo — Tema
La razón de siempre.

3. ❄️ Tercer tema — Tema
Otra razón.

4. 🛡️ Cuarto tema — Actualidad
Novedad de ayer.
Fecha: 23 de octubre de 2026
Fuente: Logística Hoy
[ver noticia](https://logisticahoy.example/dos)

¿Cuál desarrollamos? Escribe el número.`;

  it('extrae todos los temas con sus campos', () => {
    const resultado = parseTopics(lista);

    expect(resultado).not.toBeNull();
    expect(resultado?.topics).toHaveLength(4);

    const actualidad = resultado?.topics.filter((t) => t.kind === 'Actualidad') ?? [];
    expect(actualidad).toHaveLength(2);
    expect(actualidad[0].url).toMatch(/^https:\/\//);
    expect(actualidad[0].source).toBeTruthy();
  });

  it('separa el texto de cierre de la lista', () => {
    expect(parseTopics(lista)?.closingText).toBe('¿Cuál desarrollamos? Escribe el número.');
  });

  it('renumera del 1 al N después de reordenar', () => {
    const numeros = parseTopics(lista)?.topics.map((t) => t.number);
    expect(numeros).toEqual([1, 2, 3, 4]);
  });

  it('mantiene el mismo orden mientras el texto no cambie', () => {
    const primera = parseTopics(lista)?.topics.map((t) => t.title);
    const segunda = parseTopics(lista)?.topics.map((t) => t.title);

    // El orden se deriva del propio texto: dos renderizados del mismo mensaje
    // no pueden bailar en la pantalla.
    expect(primera).toEqual(segunda);
  });

  it('no deja fuera ningún tema al reordenar', () => {
    const titulos = parseTopics(lista)?.topics.map((t) => t.title) ?? [];

    expect(titulos).toHaveLength(4);
    expect(new Set(titulos).size).toBe(4);
    // El emoji es parte del título: la interfaz lo muestra tal cual.
    expect(titulos).toContain('🚨 Primer tema de actualidad');
    expect(titulos).toContain('🛡️ Cuarto tema');
  });

  it('devuelve null si hay menos de tres temas (texto que no es una lista)', () => {
    const corta = `1. 🚨 Uno — Tema
Razón.

2. 📦 Dos — Tema
Razón.`;

    expect(parseTopics(corta)).toBeNull();
  });

  it('devuelve null para texto sin temas', () => {
    expect(parseTopics('Hola, ¿en qué te ayudo?')).toBeNull();
  });

  it('tolera un tema de actualidad sin fecha ni enlace', () => {
    const lista2 = `1. 🚨 Uno — Actualidad
Razón.

2. 📦 Dos — Tema
Razón.

3. ❄️ Tres — Tema
Razón.`;

    const resultado = parseTopics(lista2);
    expect(resultado?.topics).toHaveLength(3);
    expect(resultado?.topics.find((t) => t.kind === 'Actualidad')?.date).toBeUndefined();
  });
});

describe('parseAngle', () => {
  const bloque = `---ANGULO---
🎯 Ángulo
No es el robo: es enterarse tarde.

💡 Por qué ahora
El reporte salió hoy.

🎭 Emoción objetivo
Urgencia controlada.
---FIN_ANGULO---`;

  it('extrae las tres líneas', () => {
    const angulo = parseAngle(bloque);

    expect(angulo?.angulo).toBe('No es el robo: es enterarse tarde.');
    expect(angulo?.porQueAhora).toBe('El reporte salió hoy.');
    expect(angulo?.emocion).toBe('Urgencia controlada.');
  });

  it('devuelve null sin bloque de ángulo', () => {
    expect(parseAngle('texto normal')).toBeNull();
  });

  it('devuelve null si el bloque existe pero viene vacío', () => {
    expect(parseAngle('---ANGULO---\n\n---FIN_ANGULO---')).toBeNull();
  });
});

describe('parseVersions', () => {
  const bloque = `---VERSIONES---
FORMATO: Copy
---VERSION A---
TITULO: Gancho A
TITULARES:
1. Titular A1
2. Titular A2
3. Titular A3
CONTENIDO:
CUERPO:
Cuerpo de la versión A.
HASHTAGS: #Uno #Dos
---FIN VERSION A---
---VERSION B---
TITULO: Gancho B
TITULARES:
1. Titular B1
2. Titular B2
3. Titular B3
CONTENIDO:
CUERPO:
Cuerpo de la versión B.
HASHTAGS: #Tres
---FIN VERSION B---
---FIN VERSIONES---`;

  it('extrae el formato y las dos versiones', () => {
    const versiones = parseVersions(bloque);

    expect(versiones?.format).toBe('Copy');
    expect(versiones?.versionA.titulo).toBe('Gancho A');
    expect(versiones?.versionB.titulo).toBe('Gancho B');
  });

  it('extrae los tres titulares de cada versión', () => {
    const versiones = parseVersions(bloque);

    expect(versiones?.versionA.titulares).toEqual(['Titular A1', 'Titular A2', 'Titular A3']);
    expect(versiones?.versionB.titulares).toHaveLength(3);
  });

  it('devuelve null si falta una de las dos versiones', () => {
    const soloA = `---VERSIONES---
FORMATO: Copy
---VERSION A---
TITULO: A
TITULARES:
1. uno
CONTENIDO:
texto
---FIN VERSION A---
---FIN VERSIONES---`;

    expect(parseVersions(soloA)).toBeNull();
  });

  it('devuelve null sin bloque de versiones', () => {
    expect(parseVersions('texto')).toBeNull();
  });
});

describe('parseVersionContent', () => {
  it('separa cuerpo y hashtags en formato Copy', () => {
    const contenido = 'CUERPO:\nUn cuerpo cualquiera.\nHASHTAGS: #Uno #Dos #Tres';
    const parsed = parseVersionContent(contenido);

    expect(parsed.cuerpo).toBe('Un cuerpo cualquiera.');
    expect(parsed.hashtags).toEqual(['#Uno', '#Dos', '#Tres']);
    expect(parsed.copyImagen).toBeUndefined();
  });

  it('separa las tres secciones en formato Copy + imagen', () => {
    const contenido = `COPY DEL POST:
Cuerpo del post.
HASHTAGS: #Uno
COPY DE LA IMAGEN:
TEXTO DE IMPACTO
PROMPT PARA IMAGEN:
Fondo oscuro, texto blanco.`;

    const parsed = parseVersionContent(contenido);

    expect(parsed.cuerpo).toBe('Cuerpo del post.');
    expect(parsed.hashtags).toEqual(['#Uno']);
    expect(parsed.copyImagen).toBe('TEXTO DE IMPACTO');
    expect(parsed.promptImagen).toBe('Fondo oscuro, texto blanco.');
  });

  it('devuelve el contenido tal cual cuando no hay hashtags', () => {
    const parsed = parseVersionContent('Slide 1: Portada — gancho\nSlide 2: dato');

    expect(parsed.cuerpo).toContain('Slide 1');
    expect(parsed.hashtags).toEqual([]);
  });

  it('no confunde un corchete de cierre con parte del hashtag', () => {
    const parsed = parseVersionContent('CUERPO:\ntexto\nHASHTAGS: [#Uno #Dos]');
    expect(parsed.hashtags).toEqual(['#Uno', '#Dos']);
  });
});
