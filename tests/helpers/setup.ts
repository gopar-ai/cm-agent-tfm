import { beforeEach, vi } from 'vitest';

/**
 * Arranque común de las pruebas.
 *
 * Fija un entorno mínimo y predecible para que ninguna prueba dependa de lo que
 * haya en el `.env.local` de quien la corre, y silencia los avisos esperados de
 * los casos de error (una caché que no se puede escribir, un feed caído) para
 * que la salida de la suite se lea.
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

Object.assign(process.env, { NODE_ENV: 'test' });
process.env.TZ = 'America/Mexico_City';

// La caché del feed, a un directorio temporal: una prueba no debe escribir en
// `./data` del proyecto. Se detectó porque una captura del README acabó
// mostrando la noticia de ejemplo de una prueba.
process.env.NEWS_CACHE_DIR = mkdtempSync(join(tmpdir(), 'cm-agent-tests-'));

// Cada prueba declara la configuración que necesita. Heredar algo del entorno
// hace que la suite pase en una máquina y falle en otra: la integración
// continua corre con DEMO_MODE=true, y eso tumbaba las pruebas del feed real
// sin que se notara en local.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.APP_USERNAME;
delete process.env.APP_PASSWORD;
delete process.env.APP_PASSWORD_HASH;
delete process.env.JWT_SECRET;
delete process.env.CRON_SECRET;
delete process.env.DEMO_MODE;
delete process.env.DEMO_HINT;
delete process.env.DAILY_MODEL_CALL_BUDGET;
delete process.env.LOGIN_MAX_ATTEMPTS;
delete process.env.LOGIN_WINDOW_SECONDS;
delete process.env.CHAT_MAX_PER_MINUTE;
delete process.env.NEWS_RSS_FEEDS;
delete process.env.NEWS_SEARCH_DOMAINS;
delete process.env.NEWS_SEARCH_QUERIES;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
