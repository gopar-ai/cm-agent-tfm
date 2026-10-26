import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CALENDAR_KEY, type CalendarPost, PUBLISHED_KEY } from '@/lib/calendar-storage';
import {
  construirContenidoDemo,
  MARCA_SIEMBRA,
  PLANTILLAS,
  sembrarContenidoDemo,
} from '@/lib/demo-seed';
import { readJson, writeJson } from '@/lib/local-store';
import { installBrowser } from './helpers/browser';

/**
 * El contenido de ejemplo del calendario.
 *
 * Lo delicado no es sembrarlo, es no estropear nada al hacerlo: una instalación
 * real no debe tocarse, y el trabajo de quien ya usó la demo tampoco.
 */

let browser: ReturnType<typeof installBrowser>;

beforeEach(() => {
  browser = installBrowser();
});

afterEach(() => {
  browser.uninstall();
});

const HOY = new Date('2026-10-25T18:00:00Z');

describe('construirContenidoDemo', () => {
  it('crea una publicación por plantilla', () => {
    expect(construirContenidoDemo(HOY)).toHaveLength(PLANTILLAS.length);
  });

  it('reparte los tres estados, para que se vea el flujo completo', () => {
    const estados = new Set(construirContenidoDemo(HOY).map((p) => p.status));
    expect(estados).toEqual(new Set(['publicado', 'programado', 'borrador']));
  });

  it('calcula las fechas sobre el día en curso', () => {
    const publicaciones = construirContenidoDemo(HOY);

    // La primera plantilla está doce días atrás.
    expect(publicaciones[0].fecha).toBe('2026-10-13');
    // Y hay publicaciones por delante del día de hoy.
    expect(publicaciones.some((p) => p.fecha > '2026-10-25')).toBe(true);
  });

  it('da identificadores distintos a cada publicación', () => {
    const ids = construirContenidoDemo(HOY).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el contenido no menciona ninguna marca real', () => {
    const texto = construirContenidoDemo(HOY)
      .map((p) => `${p.titular} ${p.cuerpo}`)
      .join(' ');

    expect(texto).not.toMatch(/Detecta|LealUp|GSM/i);
  });
});

describe('sembrarContenidoDemo', () => {
  it('no hace nada si no es una demo', () => {
    expect(sembrarContenidoDemo(false, HOY)).toBe('no-aplica');
    expect(readJson<CalendarPost[]>(CALENDAR_KEY, [])).toEqual([]);
  });

  it('siembra el calendario la primera vez', () => {
    expect(sembrarContenidoDemo(true, HOY)).toBe('sembrado');

    const calendario = readJson<CalendarPost[]>(CALENDAR_KEY, []);
    expect(calendario).toHaveLength(PLANTILLAS.length);
  });

  it('deja la lista de publicados en sincronía', () => {
    sembrarContenidoDemo(true, HOY);

    const publicados = readJson<CalendarPost[]>(PUBLISHED_KEY, []);
    expect(publicados.length).toBeGreaterThan(0);
    expect(publicados.every((p) => p.status === 'publicado')).toBe(true);
  });

  it('no vuelve a sembrar en la siguiente visita', () => {
    sembrarContenidoDemo(true, HOY);
    expect(sembrarContenidoDemo(true, HOY)).toBe('ya-sembrado');

    expect(readJson<CalendarPost[]>(CALENDAR_KEY, [])).toHaveLength(PLANTILLAS.length);
  });

  it('respeta el trabajo de quien ya usó la demo', () => {
    const propio: CalendarPost = {
      id: 'mio',
      titular: 'Mi propio post',
      cuerpo: 'texto',
      hashtags: '',
      promptImagen: '',
      fecha: '2026-10-20',
      status: 'borrador',
    };
    writeJson(CALENDAR_KEY, [propio]);

    expect(sembrarContenidoDemo(true, HOY)).toBe('calendario-con-datos');
    expect(readJson<CalendarPost[]>(CALENDAR_KEY, [])).toEqual([propio]);
  });

  it('deja marca para no volver a mirarlo en cada pantalla', () => {
    sembrarContenidoDemo(true, HOY);
    expect(readJson<string | null>(MARCA_SIEMBRA, null)).toBeTruthy();
  });

  it('sin navegador no lanza: el layout también se renderiza en el servidor', () => {
    browser.uninstall();
    expect(() => sembrarContenidoDemo(true, HOY)).not.toThrow();
  });
});
