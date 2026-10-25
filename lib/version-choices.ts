import { readJson, writeJson } from './local-store';

/**
 * Registro de qué versión eligió el analista en cada propuesta.
 * Alimenta la memoria de preferencias (`lib/agent-memory.ts`).
 */

export type VersionChoice = {
  tema: string;
  formato: string;
  version: 'A' | 'B';
  timestamp: number;
};

const KEY = 'cm_version_choices';
const MAX_STORED = 200;

export function logVersionChoice(choice: VersionChoice): void {
  writeJson(KEY, [...getVersionChoices(), choice].slice(-MAX_STORED));
}

export function getVersionChoices(): VersionChoice[] {
  const stored = readJson<VersionChoice[]>(KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export { KEY as VERSION_CHOICES_KEY, MAX_STORED };
