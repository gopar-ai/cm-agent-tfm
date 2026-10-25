import { emitChange, newId, readJson, subscribeToChange, writeJson } from './local-store';

/**
 * Calendario de contenido: borradores, programados y publicados.
 */

export type PostStatus = 'borrador' | 'programado' | 'publicado';

export type CalendarPost = {
  id: string;
  titular: string;
  cuerpo: string;
  hashtags: string;
  promptImagen: string;
  fecha: string;
  status: PostStatus;
};

const CALENDAR_KEY = 'cm_calendar';
const DRAFTS_KEY = 'cm_borradores';
const PUBLISHED_KEY = 'cm_published_posts';
const PUBLISHED_EVENT = 'cm-published-updated';

export function addToCalendar(post: Omit<CalendarPost, 'id' | 'status'>): CalendarPost {
  const saved = readJson<CalendarPost[]>(CALENDAR_KEY, []);
  const newPost: CalendarPost = { ...post, id: newId(), status: 'programado' };
  writeJson(CALENDAR_KEY, [...saved, newPost]);
  return newPost;
}

/**
 * Guarda un post como borrador dentro del calendario, con la fecha de hoy.
 *
 * Es lo que hace el botón "+ Calendario" de una propuesta: deja el post a la
 * vista en el mes, todavía como borrador, para fecharlo después. La pantalla del
 * chat escribía esto a mano con `Date.now()` como identificador; pasa por aquí
 * para que use un identificador único como el resto.
 */
export function addDraftToCalendar(
  post: Omit<CalendarPost, 'id' | 'status' | 'fecha'>,
  today: Date = new Date()
): CalendarPost {
  const saved = readJson<CalendarPost[]>(CALENDAR_KEY, []);
  const newPost: CalendarPost = {
    ...post,
    id: newId(),
    status: 'borrador',
    fecha: today.toISOString().split('T')[0],
  };
  writeJson(CALENDAR_KEY, [...saved, newPost]);
  return newPost;
}

export function saveDraft(post: Omit<CalendarPost, 'id' | 'status' | 'fecha'>): CalendarPost {
  const saved = readJson<CalendarPost[]>(DRAFTS_KEY, []);
  const newPost: CalendarPost = { ...post, id: newId(), status: 'borrador', fecha: '' };
  writeJson(DRAFTS_KEY, [...saved, newPost]);
  return newPost;
}

function readPublished(): CalendarPost[] {
  const stored = readJson<CalendarPost[]>(PUBLISHED_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

function writePublished(posts: CalendarPost[]): void {
  writeJson(PUBLISHED_KEY, posts);
  emitChange(PUBLISHED_EVENT);
}

export function getPublishedPosts(): CalendarPost[] {
  return readPublished();
}

/** Mantiene la lista de publicados en sincronía con el estado real del post. */
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
  return subscribeToChange(PUBLISHED_EVENT, callback);
}

export { CALENDAR_KEY, DRAFTS_KEY, PUBLISHED_KEY, PUBLISHED_EVENT };
