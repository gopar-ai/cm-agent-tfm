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
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getVersionEditState(id: string): VersionEditState | null {
  return readAll()[id] ?? null;
}

export function saveVersionEditState(id: string, state: VersionEditState): void {
  const all = readAll();
  all[id] = state;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}
