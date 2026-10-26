#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Genera las portadas del feed de demostración.
 *
 * En modo real, cada noticia trae la imagen del medio que la publicó. En la
 * demo no hay medios reales, así que las portadas se dibujan aquí: con el
 * sector de la noticia, no con una foto, para que quede claro que son de
 * ejemplo y para no usar material de terceros.
 *
 * Uso: node scripts/portadas-demo.mjs
 */

const DESTINO = 'public/demo-news';
mkdirSync(DESTINO, { recursive: true });

/** Una por noticia de `lib/news-demo.ts`, en el mismo orden. */
const PORTADAS = [
  { archivo: 'ia-producto', etiqueta: 'Informe del sector', titulo: 'IA en producto', icono: '🤖', tono: '#6366F1' },
  { archivo: 'regulacion-datos', etiqueta: 'Regulación', titulo: 'Datos personales', icono: '⚖️', tono: '#1f6feb' },
  { archivo: 'costo-nube', etiqueta: 'Infraestructura', titulo: 'Costo de la nube', icono: '☁️', tono: '#8957e5' },
  { archivo: 'ciberseguridad', etiqueta: 'Amenazas', titulo: 'Cadena de suministro', icono: '🔐', tono: '#1f9cd6' },
  { archivo: 'talento', etiqueta: 'Mercado laboral', titulo: 'Talento técnico', icono: '👩‍💻', tono: '#2da44e' },
  { archivo: 'integraciones', etiqueta: 'Plataformas', titulo: 'Integraciones', icono: '🔌', tono: '#bf8700' },
];

const navegador = await chromium.launch();
const page = await navegador.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 2 });

for (const { archivo, etiqueta, titulo, icono, tono } of PORTADAS) {
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;800&display=swap');
      * { margin:0; padding:0; box-sizing:border-box; }
      body { width:640px; height:360px; font-family:Inter,system-ui,sans-serif; overflow:hidden; }
      .fondo {
        width:640px; height:360px; position:relative;
        background:
          radial-gradient(900px 400px at 85% -10%, ${tono}38, transparent 60%),
          linear-gradient(145deg, #161616 0%, #0d0d0d 100%);
        display:flex; flex-direction:column; justify-content:space-between; padding:38px 42px;
      }
      /* Trama diagonal discreta: da textura sin competir con el texto. */
      .fondo::after {
        content:''; position:absolute; inset:0; opacity:.05;
        background:repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 13px);
      }
      .cinta { width:70px; height:5px; background:${tono}; border-radius:3px; }
      .etiqueta { font-size:15px; font-weight:500; letter-spacing:2.6px; text-transform:uppercase; color:#9a9a9a; margin-top:20px; }
      .titulo { font-size:50px; font-weight:800; color:#fff; line-height:1.08; letter-spacing:-1px; margin-top:10px; }
      .pie { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; }
      .icono { font-size:40px; }
      .marca { font-size:13px; letter-spacing:2.2px; color:#6a6a6a; text-transform:uppercase; }
    </style></head><body>
      <div class="fondo">
        <div>
          <div class="cinta"></div>
          <div class="etiqueta">${etiqueta}</div>
          <div class="titulo">${titulo}</div>
        </div>
        <div class="pie"><span class="icono">${icono}</span><span class="marca">Feed de ejemplo</span></div>
      </div>
    </body></html>`,
    { waitUntil: 'networkidle' }
  );

  await page.locator('.fondo').screenshot({
    path: join(DESTINO, `${archivo}.jpg`),
    type: 'jpeg',
    quality: 82,
  });
  console.log(`  ${archivo}.jpg`);
}

await navegador.close();
console.log(`\n${PORTADAS.length} portadas en ${DESTINO}`);
