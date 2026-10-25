#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Genera las capturas de `docs/screenshots/` recorriendo la aplicación.
 *
 * Se hacen con un script y no a mano por dos razones: las capturas del README
 * envejecen en cuanto cambia la interfaz, y —más importante— así se garantiza
 * que salen de la demo con la marca ficticia, nunca de una instalación real con
 * datos de un cliente.
 *
 * Uso:
 *   1. Levantar la app en modo demostración (DEMO_MODE=true) en el puerto 3100.
 *   2. node scripts/capturas.mjs
 */

const BASE = process.env.CAPTURAS_URL || 'http://127.0.0.1:3100';
const DESTINO = 'docs/screenshots';
const USUARIO = process.env.CAPTURAS_USER || 'demo';
const CONTRASENA = process.env.CAPTURAS_PASS || 'demo1234';

mkdirSync(DESTINO, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2, // el README se lee en pantallas de alta densidad
  locale: 'es-MX',
  timezoneId: 'America/Mexico_City',
});
const page = await contexto.newPage();

async function capturar(nombre) {
  await page.screenshot({ path: `${DESTINO}/${nombre}.png` });
  console.log(`  ✓ ${nombre}.png`);
}

console.log('Generando capturas desde', BASE);

// 1 · Acceso
await page.goto(`${BASE}/login`);
await page.waitForSelector('#username');
await capturar('1-acceso');

// 2 · El agente propone temas al abrir una propuesta
await page.fill('#username', USUARIO);
await page.fill('#password', CONTRASENA);
await page.click('button[type="submit"]');
await page.waitForURL(/dashboard/);
await page.getByRole('button', { name: /Elegir este tema/ }).first().waitFor();
await page.waitForTimeout(500);
await capturar('2-temas');

// 3 · Ángulo antes de escribir
await page.getByRole('button', { name: /Elegir este tema/ }).first().click();
await page.getByText('🎯 Ángulo').waitFor();
await page.waitForTimeout(500);
await capturar('3-angulo');

// 4 · Dos versiones para comparar
await page.getByRole('button', { name: '📝 Copy' }).first().click();
await page.getByText('Versión A').waitFor();
await page.waitForTimeout(800);
await capturar('4-versiones');

// 5 · Calendario de contenido
await page.goto(`${BASE}/calendar`);
await page.getByRole('button', { name: '›' }).waitFor();
await page.waitForTimeout(500);
await capturar('5-calendario');

// 6 · Contexto de marca editable
await page.goto(`${BASE}/dashboard/config`);
await page.waitForTimeout(800);
await capturar('6-contexto');

await navegador.close();
console.log('Listo.');
