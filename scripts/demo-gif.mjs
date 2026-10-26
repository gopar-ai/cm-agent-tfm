#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Graba el recorrido de la demo y lo convierte en el GIF del README.
 *
 * El GIF anterior venía de una instalación real y mostraba la marca de un
 * cliente, así que no podía publicarse. Este se graba contra la demo, con la
 * marca ficticia, y se puede regenerar cuando la interfaz cambie.
 *
 * Requiere ffmpeg en el PATH.
 *
 * Uso:
 *   node scripts/demo-gif.mjs                    (contra la demo publicada)
 *   DEMO_URL=http://127.0.0.1:3100 node scripts/demo-gif.mjs
 */

const BASE = process.env.DEMO_URL || 'https://cm-agent-tfm-production.up.railway.app';
const USUARIO = process.env.DEMO_USER || 'demo';
const CONTRASENA = process.env.DEMO_PASS || 'demo1234';
const TEMPORAL = 'docs/screenshots/.video';
const SALIDA = 'docs/screenshots/demo.gif';

rmSync(TEMPORAL, { recursive: true, force: true });
mkdirSync(TEMPORAL, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 760 },
  locale: 'es-MX',
  timezoneId: 'America/Mexico_City',
  recordVideo: { dir: TEMPORAL, size: { width: 1280, height: 760 } },
});

const page = await contexto.newPage();
const pausa = (ms) => page.waitForTimeout(ms);

console.log('Grabando el recorrido desde', BASE);

await page.goto(`${BASE}/login`);
await page.waitForSelector('#username');
await pausa(1200);

// Se escribe despacio: en el GIF se tiene que ver qué credenciales son.
await page.type('#username', USUARIO, { delay: 120 });
await page.type('#password', CONTRASENA, { delay: 120 });
await pausa(600);
await page.click('button[type="submit"]');

await page.waitForURL(/dashboard/, { timeout: 60_000 });
await page.getByRole('button', { name: /Elegir este tema/ }).first().waitFor({ timeout: 60_000 });
await pausa(2500); // la lista de temas se lee

await page.getByRole('button', { name: /Elegir este tema/ }).first().click();
await page.getByText('🎯 Ángulo').waitFor({ timeout: 60_000 });
await pausa(2500); // el ángulo se lee

await page.getByRole('button', { name: '📸 Copy + imagen' }).first().click();
await page.getByText('Versión A').waitFor({ timeout: 60_000 });
await pausa(3500); // las dos versiones se comparan

await contexto.close();
await navegador.close();

const video = readdirSync(TEMPORAL).find((f) => f.endsWith('.webm'));
if (!video) throw new Error('No se generó el video.');

console.log('Convirtiendo a GIF…');

// Paleta propia: un GIF de 256 colores sobre una interfaz oscura se ve sucio
// sin este paso.
const paleta = join(TEMPORAL, 'paleta.png');
const filtros = 'fps=8,scale=820:-1:flags=lanczos';

// Se descarta el primer segundo: la página todavía está en blanco, y ese sería
// el fotograma que el README enseña mientras el GIF no se reproduce.
const DESDE = '1.2';

execFileSync(
  'ffmpeg',
  ['-y', '-ss', DESDE, '-i', join(TEMPORAL, video), '-vf', `${filtros},palettegen=stats_mode=diff`, paleta],
  { stdio: 'ignore' }
);
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-ss', DESDE,
    '-i', join(TEMPORAL, video),
    '-i', paleta,
    '-lavfi', `${filtros} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3`,
    SALIDA,
  ],
  { stdio: 'ignore' }
);

rmSync(TEMPORAL, { recursive: true, force: true });
console.log('Listo:', SALIDA);
