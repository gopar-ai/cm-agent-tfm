import { readJson, writeJson } from './local-store';

export { hashContent } from './hash';

/**
 * Ediciones del analista sobre una versión A/B: qué titular eligió y cómo dejó
 * el cuerpo. Se guarda por bloque de contenido, para que al volver a abrir una
 * propuesta aparezca como la dejó.
 */

export type VersionEditState = {
  choice: 'A' | 'B';
  selectedIndex: number;
  titulares: string[];
  cuerpo: string;
  hashtags: string[];
  copyImagen: string;
};

const KEY = 'cm_version_edit_state';

function readAll(): Record<string, VersionEditState> {
  const stored = readJson<Record<string, VersionEditState>>(KEY, {});
  return stored && typeof stored === 'object' ? stored : {};
}

export function getVersionEditState(id: string): VersionEditState | null {
  return readAll()[id] ?? null;
}

export function saveVersionEditState(id: string, state: VersionEditState): void {
  writeJson(KEY, { ...readAll(), [id]: state });
}

export { KEY as VERSION_EDIT_STATE_KEY };
