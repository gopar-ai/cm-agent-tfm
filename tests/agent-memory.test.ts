import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  addMemoryEntry,
  buildMemorySummary,
  detectTitularStyle,
  getMemory,
  MAX_STORED_ENTRIES,
  MIN_ENTRIES_FOR_SUMMARY,
  type MemoryEntry,
} from '@/lib/agent-memory';
import { installBrowser } from './helpers/browser';

function entrada(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    tema: 'custodia de carga',
    formato: 'Copy',
    version_elegida: 'A',
    titular_elegido: 'Un titular cualquiera',
    timestamp: 1,
    ...overrides,
  };
}

describe('detectTitularStyle', () => {
  it('reconoce una pregunta', () => {
    expect(detectTitularStyle('¿Cuánto cuesta una hora sin saber?')).toBe('pregunta');
  });

  it('reconoce un dato duro por llevar números', () => {
    expect(detectTitularStyle('3 rutas concentran la mitad del robo')).toBe('dato duro');
  });

  it('trata el resto como declaración', () => {
    expect(detectTitularStyle('La cuenta que nadie presupuesta')).toBe('declaración');
  });

  it('un titular vacío es declaración, no un error', () => {
    expect(detectTitularStyle('')).toBe('declaración');
    expect(detectTitularStyle('   ')).toBe('declaración');
  });

  it('la pregunta gana al número cuando están los dos', () => {
    expect(detectTitularStyle('¿Por qué 3 rutas?')).toBe('pregunta');
  });
});

describe('buildMemorySummary (HU-08)', () => {
  it('no resume con menos elecciones de las necesarias', () => {
    for (let n = 0; n < MIN_ENTRIES_FOR_SUMMARY; n++) {
      const memoria = Array.from({ length: n }, () => entrada());
      expect(buildMemorySummary(memoria), `con ${n} entradas`).toBeNull();
    }
  });

  it('resume a partir del mínimo de elecciones', () => {
    const memoria = Array.from({ length: MIN_ENTRIES_FOR_SUMMARY }, () => entrada());
    expect(buildMemorySummary(memoria)).toContain('Preferencias aprendidas');
  });

  it('detecta el formato más usado', () => {
    const resumen = buildMemorySummary([
      entrada({ formato: 'Carrusel' }),
      entrada({ formato: 'Carrusel' }),
      entrada({ formato: 'Copy' }),
    ]);

    expect(resumen).toContain('Formatos más usados: Carrusel, Copy');
  });

  it('detecta la versión preferida', () => {
    const resumen = buildMemorySummary([
      entrada({ version_elegida: 'B' }),
      entrada({ version_elegida: 'B' }),
      entrada({ version_elegida: 'A' }),
    ]);

    expect(resumen).toContain('Versión preferida: B');
  });

  it('detecta el estilo de titular preferido', () => {
    const resumen = buildMemorySummary([
      entrada({ titular_elegido: '¿Cuánto cuesta?' }),
      entrada({ titular_elegido: '¿Y si pasa hoy?' }),
      entrada({ titular_elegido: 'Una declaración' }),
    ]);

    expect(resumen).toContain('Estilo de titulares preferido: pregunta');
  });

  it('lista hasta tres temas, los más desarrollados primero', () => {
    const resumen = buildMemorySummary([
      entrada({ tema: 'custodia' }),
      entrada({ tema: 'custodia' }),
      entrada({ tema: 'cadena de frío' }),
      entrada({ tema: 'nearshoring' }),
      entrada({ tema: 'aduanas' }),
    ]);

    expect(resumen).toContain('custodia');
    expect(resumen?.split('Temas más desarrollados: ')[1]?.split(',')).toHaveLength(3);
  });

  it('no inventa datos cuando los campos vienen vacíos', () => {
    const resumen = buildMemorySummary([
      entrada({ formato: '', tema: '' }),
      entrada({ formato: '', tema: '' }),
      entrada({ formato: '', tema: '' }),
    ]);

    expect(resumen).toContain('Formatos más usados: sin datos suficientes');
    expect(resumen).toContain('Temas más desarrollados: sin datos suficientes');
  });

  it('no menciona ninguna marca: el resumen viaja al prompt de cualquier marca', () => {
    const resumen = buildMemorySummary(Array.from({ length: 3 }, () => entrada()));

    expect(resumen).toContain('Preferencias aprendidas del equipo:');
    expect(resumen).not.toMatch(/Detecta|Trazo Seguro/);
  });

  it('aguanta una memoria que no es un arreglo', () => {
    expect(buildMemorySummary(null as unknown as MemoryEntry[])).toBeNull();
    expect(buildMemorySummary('texto' as unknown as MemoryEntry[])).toBeNull();
  });

  it('descarta entradas nulas antes de contar', () => {
    const memoria = [entrada(), null, undefined, entrada()] as unknown as MemoryEntry[];
    // Quedan dos válidas: por debajo del mínimo.
    expect(buildMemorySummary(memoria)).toBeNull();
  });
});

describe('memoria guardada en el navegador', () => {
  let browser: ReturnType<typeof installBrowser>;

  beforeEach(() => {
    browser = installBrowser();
  });

  afterEach(() => {
    browser.uninstall();
  });

  it('empieza vacía', () => {
    expect(getMemory()).toEqual([]);
  });

  it('guarda y recupera una elección', () => {
    addMemoryEntry(entrada({ tema: 'cadena de frío' }));

    expect(getMemory()).toHaveLength(1);
    expect(getMemory()[0].tema).toBe('cadena de frío');
  });

  it('conserva el orden en que se eligieron', () => {
    addMemoryEntry(entrada({ tema: 'primero' }));
    addMemoryEntry(entrada({ tema: 'segundo' }));

    expect(getMemory().map((e) => e.tema)).toEqual(['primero', 'segundo']);
  });

  it('se queda con las últimas elecciones y no crece sin fin', () => {
    for (let i = 0; i < MAX_STORED_ENTRIES + 10; i++) {
      addMemoryEntry(entrada({ tema: `tema-${i}` }));
    }

    const memoria = getMemory();
    expect(memoria).toHaveLength(MAX_STORED_ENTRIES);
    expect(memoria[memoria.length - 1].tema).toBe(`tema-${MAX_STORED_ENTRIES + 9}`);
  });

  it('devuelve una lista vacía si el dato guardado está corrupto', () => {
    browser.storage.seedRaw('cm_memoria', '{no es json');
    expect(getMemory()).toEqual([]);
  });

  it('devuelve una lista vacía si el dato guardado no es una lista', () => {
    browser.storage.seedRaw('cm_memoria', '{"a":1}');
    expect(getMemory()).toEqual([]);
  });

  it('sin navegador no lanza: el servidor también importa este módulo', () => {
    browser.uninstall();
    expect(getMemory()).toEqual([]);
    expect(() => addMemoryEntry(entrada())).not.toThrow();
  });
});
