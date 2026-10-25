export type CalendarPost = {
  id: string;
  titular: string;
  cuerpo: string;
  hashtags: string;
  promptImagen: string;
  fecha: string;
  status: 'borrador' | 'programado' | 'publicado';
};

const CALENDAR_KEY = 'cm_calendar';
const DRAFTS_KEY = 'cm_borradores';
const PUBLISHED_KEY = 'cm_published_posts';
const PUBLISHED_EVENT = 'cm-published-updated';

export function addToCalendar(post: Omit<CalendarPost, 'id' | 'status'>): void {
  const saved: CalendarPost[] = JSON.parse(localStorage.getItem(CALENDAR_KEY) ?? '[]');
  const newPost: CalendarPost = { id: Date.now().toString(), status: 'programado', ...post };
  localStorage.setItem(CALENDAR_KEY, JSON.stringify([...saved, newPost]));
}

export function saveDraft(post: Omit<CalendarPost, 'id' | 'status' | 'fecha'>): void {
  const saved: CalendarPost[] = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]');
  const newPost: CalendarPost = { id: Date.now().toString(), status: 'borrador', fecha: '', ...post };
  localStorage.setItem(DRAFTS_KEY, JSON.stringify([...saved, newPost]));
}

function readPublished(): CalendarPost[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PUBLISHED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writePublished(posts: CalendarPost[]): void {
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event(PUBLISHED_EVENT));
}

export function getPublishedPosts(): CalendarPost[] {
  return readPublished();
}

/** Mantiene "cm_published_posts" en sincronía con el estado real del post en el calendario. */
export function syncPublishedPost(post: CalendarPost): void {
  const list = readPublished();
  const idx = list.findIndex((p) => p.id === post.id);

  if (post.status === 'publicado') {
    const next = idx === -1 ? [post, ...list] : list.map((p) => (p.id === post.id ? post : p));
    writePublished(next);
  } else if (idx !== -1) {
    writePublished(list.filter((p) => p.id !== post.id));
  }
}

export function removeFromPublished(id: string): void {
  const list = readPublished();
  if (list.some((p) => p.id === id)) {
    writePublished(list.filter((p) => p.id !== id));
  }
}

export function subscribeToPublished(callback: () => void): () => void {
  window.addEventListener(PUBLISHED_EVENT, callback);
  return () => window.removeEventListener(PUBLISHED_EVENT, callback);
}
