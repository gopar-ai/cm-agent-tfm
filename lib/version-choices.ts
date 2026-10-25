export type VersionChoice = {
  tema: string;
  formato: string;
  version: 'A' | 'B';
  timestamp: number;
};

const KEY = 'cm_version_choices';

export function logVersionChoice(choice: VersionChoice): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: VersionChoice[] = raw ? JSON.parse(raw) : [];
    list.push(choice);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // ignore corrupted storage
  }
}

export function getVersionChoices(): VersionChoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
