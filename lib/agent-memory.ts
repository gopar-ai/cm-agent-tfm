export type MemoryEntry = {
  tema: string;
  formato: string;
  version_elegida: 'A' | 'B';
  titular_elegido: string;
  timestamp: number;
};

const KEY = 'cm_memoria';
const MIN_ENTRIES_FOR_SUMMARY = 3;

export function getMemory(): MemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addMemoryEntry(entry: MemoryEntry): void {
  const list = getMemory();
  list.push(entry);
  localStorage.setItem(KEY, JSON.stringify(list));
}

function topEntries(counts: Map<string, number>, n: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
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

function detectTitularStyle(titular: string): string {
  const t = titular.trim();
  if (!t) return 'declaración';
  if (t.endsWith('?')) return 'pregunta';
  if (/\d/.test(t)) return 'dato duro';
  return 'declaración';
}

/**
 * Construye un resumen de preferencias editoriales a partir del historial de elecciones.
 * Devuelve null si no hay suficientes entradas para detectar un patrón confiable.
 */
export function buildMemorySummary(memoria: MemoryEntry[]): string | null {
  if (!Array.isArray(memoria) || memoria.length < MIN_ENTRIES_FOR_SUMMARY) return null;

  const formatoCounts = countBy(memoria, (m) => m.formato);
  const topFormatos = topEntries(formatoCounts, 2);

  const versionCounts = countBy(memoria, (m) => m.version_elegida);
  const [preferredVersion] = topEntries(versionCounts, 1);

  const styleCounts = countBy(memoria, (m) => detectTitularStyle(m.titular_elegido));
  const [topStyle] = topEntries(styleCounts, 1);

  const temaCounts = countBy(memoria, (m) => m.tema);
  const topTemas = topEntries(temaCounts, 3);

  if (topFormatos.length === 0 && !preferredVersion && !topStyle && topTemas.length === 0) return null;

  return `Preferencias aprendidas del equipo Detecta:
- Formatos más usados: ${topFormatos.join(', ') || 'sin datos suficientes'}
- Versión preferida: ${preferredVersion ?? 'sin datos suficientes'}
- Estilo de titulares preferido: ${topStyle ?? 'sin datos suficientes'}
- Temas más desarrollados: ${topTemas.join(', ') || 'sin datos suficientes'}`;
}
