import { readJson, writeJson } from './local-store';

/**
 * Memoria silenciosa: qué formato, qué versión y qué estilo de titular elige el
 * equipo, para que el agente se acerque a su gusto sin que nadie configure nada.
 *
 * El resumen se construye en una función pura (`buildMemorySummary`) porque es
 * lo que viaja al prompt y lo que hay que poder probar sin navegador.
 */

export type MemoryEntry = {
  tema: string;
  formato: string;
  version_elegida: 'A' | 'B';
  titular_elegido: string;
  timestamp: number;
};

const KEY = 'cm_memoria';
const MIN_ENTRIES_FOR_SUMMARY = 3;
const MAX_STORED_ENTRIES = 200;

export function getMemory(): MemoryEntry[] {
  const stored = readJson<MemoryEntry[]>(KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function addMemoryEntry(entry: MemoryEntry): void {
  // Se recorta por la cola: el historial reciente es el que describe el gusto
  // actual del equipo, y así el payload que viaja al servidor tiene techo.
  const list = [...getMemory(), entry].slice(-MAX_STORED_ENTRIES);
  writeJson(KEY, list);
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function topEntries(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

export function detectTitularStyle(titular: string): 'pregunta' | 'dato duro' | 'declaración' {
  const t = (titular ?? '').trim();
  if (!t) return 'declaración';
  if (t.endsWith('?')) return 'pregunta';
  if (/\d/.test(t)) return 'dato duro';
  return 'declaración';
}

const SIN_DATOS = 'sin datos suficientes';

/**
 * Resume las preferencias editoriales a partir del historial de elecciones.
 * Devuelve null mientras no haya elecciones suficientes para hablar de un
 * patrón: con una o dos, el "patrón" sería ruido.
 */
export function buildMemorySummary(memoria: MemoryEntry[]): string | null {
  if (!Array.isArray(memoria)) return null;

  const valid = memoria.filter((entry): entry is MemoryEntry => Boolean(entry) && typeof entry === 'object');
  if (valid.length < MIN_ENTRIES_FOR_SUMMARY) return null;

  const topFormatos = topEntries(countBy(valid, (m) => m.formato), 2);
  const [preferredVersion] = topEntries(countBy(valid, (m) => m.version_elegida), 1);
  const [topStyle] = topEntries(countBy(valid, (m) => detectTitularStyle(m.titular_elegido)), 1);
  const topTemas = topEntries(countBy(valid, (m) => m.tema), 3);

  return `Preferencias aprendidas del equipo:
- Formatos más usados: ${topFormatos.join(', ') || SIN_DATOS}
- Versión preferida: ${preferredVersion ?? SIN_DATOS}
- Estilo de titulares preferido: ${topStyle ?? SIN_DATOS}
- Temas más desarrollados: ${topTemas.join(', ') || SIN_DATOS}`;
}

export { MIN_ENTRIES_FOR_SUMMARY, MAX_STORED_ENTRIES };
