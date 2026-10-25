const USAGE_KEY = 'cm_daily_usage';
const USAGE_EVENT = 'cm-usage-updated';

export const DAILY_LIMIT = 3;

type Usage = { date: string; count: number };

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readUsage(): Usage {
  const raw = localStorage.getItem(USAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Usage;
      if (parsed.date === todayKey()) return parsed;
    } catch {
      // ignore corrupted value, falls through to reset
    }
  }
  return { date: todayKey(), count: 0 };
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
  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(USAGE_EVENT));
  return next.count;
}

export function resetUsage(): void {
  localStorage.removeItem(USAGE_KEY);
  window.dispatchEvent(new Event(USAGE_EVENT));
}

export function subscribeToUsageChanges(callback: () => void): () => void {
  window.addEventListener(USAGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(USAGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}
