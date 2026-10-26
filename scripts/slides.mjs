#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Convierte `docs/slides.md` en una presentación: `docs/slides.html` y
 * `docs/slides.pdf`.
 *
 * El Markdown es la fuente única —se edita ahí y solo ahí— y de él salen las
 * dos piezas que se entregan: una para abrir en el navegador y otra para
 * adjuntar o enlazar. Así la presentación no se desincroniza del contenido.
 *
 * El conversor cubre lo que usan estas slides (encabezados, listas, tablas,
 * código, citas y negritas) y nada más: añadir una dependencia de Markdown
 * completa para doce diapositivas no se justifica.
 */

const ORIGEN = 'docs/slides.md';
const HTML = 'docs/slides.html';
const PDF = 'docs/slides.pdf';

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Negritas, cursivas, código y enlaces dentro de una línea. */
function enLinea(texto) {
  return escapar(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function bloqueDeTabla(lineas) {
  const celdas = (linea) =>
    linea
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());

  const encabezado = celdas(lineas[0]);
  const cuerpo = lineas.slice(2).map(celdas);
  const hayEncabezado = encabezado.some(Boolean);

  return `<table>${
    hayEncabezado ? `<thead><tr>${encabezado.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead>` : ''
  }<tbody>${cuerpo
    .map((fila) => `<tr>${fila.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

/** Convierte el cuerpo de una diapositiva. */
function convertir(markdown) {
  const lineas = markdown.split('\n');
  const salida = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i];

    if (!linea.trim()) {
      i++;
      continue;
    }

    if (linea.startsWith('```')) {
      const codigo = [];
      i++;
      while (i < lineas.length && !lineas[i].startsWith('```')) codigo.push(lineas[i++]);
      i++;
      salida.push(`<pre><code>${escapar(codigo.join('\n'))}</code></pre>`);
      continue;
    }

    if (linea.trim().startsWith('|')) {
      const tabla = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) tabla.push(lineas[i++]);
      salida.push(bloqueDeTabla(tabla));
      continue;
    }

    if (/^[-*] /.test(linea.trim())) {
      const items = [];
      while (i < lineas.length && /^[-*] /.test(lineas[i].trim())) {
        items.push(`<li>${enLinea(lineas[i].trim().slice(2))}</li>`);
        i++;
      }
      salida.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (linea.startsWith('> ')) {
      const cita = [];
      while (i < lineas.length && lineas[i].startsWith('> ')) cita.push(lineas[i++].slice(2));
      salida.push(`<blockquote>${enLinea(cita.join(' '))}</blockquote>`);
      continue;
    }

    const encabezado = linea.match(/^(#{1,4}) (.+)$/);
    if (encabezado) {
      const nivel = encabezado[1].length;
      salida.push(`<h${nivel}>${enLinea(encabezado[2])}</h${nivel}>`);
      i++;
      continue;
    }

    // Párrafo: se juntan las líneas seguidas.
    const parrafo = [];
    while (
      i < lineas.length &&
      lineas[i].trim() &&
      !lineas[i].startsWith('#') &&
      !lineas[i].startsWith('|') &&
      !lineas[i].startsWith('>') &&
      !lineas[i].startsWith('```') &&
      !/^[-*] /.test(lineas[i].trim())
    ) {
      parrafo.push(lineas[i++]);
    }
    salida.push(`<p>${enLinea(parrafo.join(' '))}</p>`);
  }

  return salida.join('\n');
}

const markdown = readFileSync(ORIGEN, 'utf8');

// La cabecera del archivo (antes del primer separador) es una nota de uso, no
// una diapositiva.
const partes = markdown.split(/\n---\n/).map((p) => p.trim()).filter(Boolean);
const diapositivas = partes.slice(1);

const estilos = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; font-family: Inter, system-ui, sans-serif; }
  .slide {
    width: 1280px; height: 720px; background: #0f0f0f; color: #e8e8e8;
    padding: 72px 88px; display: flex; flex-direction: column; justify-content: center;
    position: relative; overflow: hidden; page-break-after: always;
    border-top: 5px solid #6366F1;
  }
  .slide + .slide { margin-top: 28px; }
  h2 { font-size: 46px; font-weight: 800; color: #fff; margin-bottom: 26px; letter-spacing: -0.5px; }
  h3 { font-size: 30px; font-weight: 600; color: #fff; margin: 14px 0 10px; }
  h4 { font-size: 22px; font-weight: 600; color: #bdbdbd; margin: 10px 0 6px; }
  p { font-size: 23px; line-height: 1.55; color: #cfcfcf; margin-bottom: 14px; }
  strong { color: #fff; font-weight: 600; }
  em { color: #cfcfcf; }
  ul { margin: 6px 0 14px 26px; }
  li { font-size: 22px; line-height: 1.6; color: #cfcfcf; margin-bottom: 9px; }
  li::marker { color: #6366F1; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 0.88em; color: #ff8a8a;
         background: #1b1b1b; padding: 2px 7px; border-radius: 4px; }
  pre { background: #161616; border: 1px solid #262626; border-left: 3px solid #6366F1;
        border-radius: 8px; padding: 20px 24px; margin: 14px 0; overflow: hidden; }
  pre code { background: none; color: #d4d4d4; font-size: 17px; line-height: 1.6; padding: 0;
              font-variant-ligatures: none; }
  code { font-variant-ligatures: none; }
  blockquote { border-left: 3px solid #6366F1; padding-left: 20px; margin: 16px 0;
               font-size: 26px; color: #fff; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  th { text-align: left; font-size: 16px; text-transform: uppercase; letter-spacing: 1.2px;
       color: #8a8a8a; padding: 10px 14px; border-bottom: 1px solid #333; font-weight: 600; }
  td { font-size: 21px; color: #cfcfcf; padding: 11px 14px; border-bottom: 1px solid #1e1e1e; }
  td strong { color: #fff; }
  a { color: #ff8a8a; text-decoration: none; }
  .pie { position: absolute; bottom: 30px; left: 88px; right: 88px;
         display: flex; justify-content: space-between; font-size: 15px; color: #5a5a5a; }
  .marca { color: #6366F1; font-weight: 800; letter-spacing: 0.4px; }
`;

const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>CM Agent · Presentación</title><style>${estilos}</style></head>
<body>
${diapositivas
  .map(
    (slide, i) => `<section class="slide">
${convertir(slide)}
  <div class="pie"><span class="marca">CM AGENT</span><span>${i + 1} / ${diapositivas.length}</span></div>
</section>`
  )
  .join('\n')}
</body></html>`;

writeFileSync(HTML, html);
console.log(`  ${HTML} · ${diapositivas.length} diapositivas`);

const navegador = await chromium.launch();
const page = await navegador.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.pdf({
  path: PDF,
  width: '1280px',
  height: '720px',
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});
await navegador.close();

console.log(`  ${PDF}`);
