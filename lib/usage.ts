import { dayKey } from './day-key';
import { emitChange, readJson, removeKey, subscribeToChange, writeJson } from './local-store';

/**
 * Contador de propuestas del día, del lado del navegador.
 *
 * Es un recordatorio para el analista ("vas 2 de 3 hoy"), no un control: el
 * tope que de verdad protege el gasto vive en el servidor
 * (`lib/model-budget.ts`). Se dejan los dos a propósito, y la razón está en
 * docs/03-diseno.md.
 */

const USAGE_KEY = 'cm_daily_usage';
const USAGE_EVENT = 'cm-usage-updated';

export const DAILY_LIMIT = 3;

type Usage = { date: string; count: number };

function readUsage(): Usage {
  const today = dayKey();
  const stored = readJson<Usage | null>(USAGE_KEY, null);
  if (stored && stored.date === today && typeof stored.count === 'number') return stored;
  return { date: today, count: 0 };
}

export function getUsageCount(): number {
  return readUsage().count;
}

export function hasReachedDailyLimit(): boolean {
  return readUsage().count >= DAILY_LIMIT;
}

export function incrementUsage(): number {
  const usage = readUsage();
  const next: Usage = { date: usage.date, count: usage.count + 1 };
  writeJson(USAGE_KEY, next);
  emitChange(USAGE_EVENT);
  return next.count;
}

export function resetUsage(): void {
  removeKey(USAGE_KEY);
  emitChange(USAGE_EVENT);
}

export function subscribeToUsageChanges(callback: () => void): () => void {
  return subscribeToChange(USAGE_EVENT, callback, { alsoListenStorage: true });
}

export { USAGE_KEY, USAGE_EVENT };
