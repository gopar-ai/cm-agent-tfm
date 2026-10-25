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

delete process.env.ANTHROPIC_API_KEY;
delete process.env.APP_USERNAME;
delete process.env.APP_PASSWORD;
delete process.env.APP_PASSWORD_HASH;
delete process.env.JWT_SECRET;
delete process.env.CRON_SECRET;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
