import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDraftToCalendar,
  addToCalendar,
  CALENDAR_KEY,
  type CalendarPost,
  DRAFTS_KEY,
  getPublishedPosts,
  removeFromPublished,
  saveDraft,
  subscribeToPublished,
  syncPublishedPost,
} from '@/lib/calendar-storage';
import { getSavedNews, isNewsSaved, removeSavedNews, saveNews } from '@/lib/news-storage';
import { getVersionChoices, logVersionChoice, MAX_STORED } from '@/lib/version-choices';
import { getVersionEditState, hashContent, saveVersionEditState } from '@/lib/version-edit-state';
import {
  DAILY_LIMIT,
  getUsageCount,
  hasReachedDailyLimit,
  incrementUsage,
  resetUsage,
  USAGE_KEY,
} from '@/lib/usage';
import { readJson } from '@/lib/local-store';
import { installBrowser } from './helpers/browser';

let browser: ReturnType<typeof installBrowser>;

beforeEach(() => {
  browser = installBrowser();
});

afterEach(() => {
  browser.uninstall();
});

const postBase = {
  titular: 'Un titular',
  cuerpo: 'Un cuerpo',
  hashtags: '#uno',
  promptImagen: '',
};

describe('calendar-storage (HU-10)', () => {
  it('programa un post con fecha', () => {
    addToCalendar({ ...postBase, fecha: '2026-10-28' });

    const programados = readJson<CalendarPost[]>(CALENDAR_KEY, []);
    expect(programados).toHaveLength(1);
    expect(programados[0].status).toBe('programado');
    expect(programados[0].fecha).toBe('2026-10-28');
  });

  it('guarda un borrador sin fecha', () => {
    saveDraft(postBase);

    const borradores = readJson<CalendarPost[]>(DRAFTS_KEY, []);
    expect(borradores[0].status).toBe('borrador');
    expect(borradores[0].fecha).toBe('');
  });

  it('da identificadores distintos a dos posts guardados de seguido', () => {
    // El error que arregla: con `Date.now()` como id, dos posts guardados en el
    // mismo milisegundo quedaban con el mismo, y marcar uno como publicado
    // arrastraba al otro.
    const primero = addToCalendar({ ...postBase, fecha: '2026-10-28' });
    const segundo = addToCalendar({ ...postBase, fecha: '2026-10-29' });

    expect(primero.id).not.toBe(segundo.id);
  });

  it('guarda un borrador dentro del calendario con la fecha de hoy', () => {
    // Es lo que hace el botón "+ Calendario" de una propuesta.
    const post = addDraftToCalendar(postBase, new Date('2026-10-25T18:00:00Z'));

    expect(post.status).toBe('borrador');
    expect(post.fecha).toBe('2026-10-25');
    expect(readJson<CalendarPost[]>(CALENDAR_KEY, [])).toHaveLength(1);
  });

  it('dos borradores seguidos no comparten identificador', () => {
    const primero = addDraftToCalendar(postBase);
    const segundo = addDraftToCalendar(postBase);

    expect(primero.id).not.toBe(segundo.id);
    expect(readJson<CalendarPost[]>(CALENDAR_KEY, [])).toHaveLength(2);
  });

  it('un post publicado entra en la lista de publicados', () => {
    const post = addToCalendar({ ...postBase, fecha: '2026-10-28' });

    syncPublishedPost({ ...post, status: 'publicado' });

    expect(getPublishedPosts()).toHaveLength(1);
    expect(getPublishedPosts()[0].id).toBe(post.id);
  });

  it('actualiza el publicado en vez de duplicarlo', () => {
    const post = addToCalendar({ ...postBase, fecha: '2026-10-28' });

    syncPublishedPost({ ...post, status: 'publicado' });
    syncPublishedPost({ ...post, status: 'publicado', titular: 'Titular corregido' });

    expect(getPublishedPosts()).toHaveLength(1);
    expect(getPublishedPosts()[0].titular).toBe('Titular corregido');
  });

  it('al dejar de estar publicado sale de la lista', () => {
    const post = addToCalendar({ ...postBase, fecha: '2026-10-28' });

    syncPublishedPost({ ...post, status: 'publicado' });
    syncPublishedPost({ ...post, status: 'programado' });

    expect(getPublishedPosts()).toEqual([]);
  });

  it('marcar como publicado un post no afecta a los demás', () => {
    const primero = addToCalendar({ ...postBase, fecha: '2026-10-28' });
    const segundo = addToCalendar({ ...postBase, fecha: '2026-10-29' });

    syncPublishedPost({ ...primero, status: 'publicado' });

    const publicados = getPublishedPosts();
    expect(publicados).toHaveLength(1);
    expect(publicados.some((p) => p.id === segundo.id)).toBe(false);
  });

  it('quita un publicado por identificador', () => {
    const post = addToCalendar({ ...postBase, fecha: '2026-10-28' });
    syncPublishedPost({ ...post, status: 'publicado' });

    removeFromPublished(post.id);
    expect(getPublishedPosts()).toEqual([]);
  });

  it('quitar un publicado que no existe no hace nada', () => {
    const avisos = vi.fn();
    const desuscribir = subscribeToPublished(avisos);

    removeFromPublished('fantasma');

    expect(avisos).not.toHaveBeenCalled();
    desuscribir();
  });

  it('avisa a la interfaz cuando cambian los publicados', () => {
    const avisos = vi.fn();
    const desuscribir = subscribeToPublished(avisos);
    const post = addToCalendar({ ...postBase, fecha: '2026-10-28' });

    syncPublishedPost({ ...post, status: 'publicado' });
    expect(avisos).toHaveBeenCalledTimes(1);

    desuscribir();
  });

  it('devuelve lista vacía si lo guardado está corrupto', () => {
    browser.storage.seedRaw('cm_published_posts', 'no es json');
    expect(getPublishedPosts()).toEqual([]);
  });
});

describe('news-storage (HU-11)', () => {
  const noticia = {
    title: 'Una noticia',
    url: 'https://medio.example/nota',
    source: 'Medio',
    date: '2026-10-24',
  };

  it('guarda una noticia y la reconoce como guardada', () => {
    saveNews(noticia);

    expect(getSavedNews()).toHaveLength(1);
    expect(isNewsSaved(noticia.url)).toBe(true);
  });

  it('no guarda dos veces la misma noticia', () => {
    saveNews(noticia);
    saveNews(noticia);

    expect(getSavedNews()).toHaveLength(1);
  });

  it('pone la más reciente al principio', () => {
    saveNews(noticia);
    saveNews({ ...noticia, url: 'https://medio.example/otra', title: 'Otra' });

    expect(getSavedNews()[0].title).toBe('Otra');
  });

  it('quita una noticia guardada', () => {
    saveNews(noticia);
    removeSavedNews(noticia.url);

    expect(getSavedNews()).toEqual([]);
    expect(isNewsSaved(noticia.url)).toBe(false);
  });

  it('quitar una que no está no afecta al resto', () => {
    saveNews(noticia);
    removeSavedNews('https://medio.example/inexistente');

    expect(getSavedNews()).toHaveLength(1);
  });
});

describe('version-choices (HU-08)', () => {
  const eleccion = { tema: 'custodia', formato: 'Copy', version: 'A' as const, timestamp: 1 };

  it('empieza vacío', () => {
    expect(getVersionChoices()).toEqual([]);
  });

  it('registra una elección', () => {
    logVersionChoice(eleccion);
    expect(getVersionChoices()).toHaveLength(1);
  });

  it('conserva el orden', () => {
    logVersionChoice({ ...eleccion, tema: 'primero' });
    logVersionChoice({ ...eleccion, tema: 'segundo' });

    expect(getVersionChoices().map((c) => c.tema)).toEqual(['primero', 'segundo']);
  });

  it('no crece sin límite', () => {
    for (let i = 0; i < MAX_STORED + 5; i++) logVersionChoice({ ...eleccion, tema: `t-${i}` });

    expect(getVersionChoices()).toHaveLength(MAX_STORED);
  });

  it('devuelve lista vacía si lo guardado está corrupto', () => {
    browser.storage.seedRaw('cm_version_choices', '{roto');
    expect(getVersionChoices()).toEqual([]);
  });
});

describe('version-edit-state (HU-06)', () => {
  const estado = {
    choice: 'A' as const,
    selectedIndex: 1,
    titulares: ['uno', 'dos'],
    cuerpo: 'cuerpo editado',
    hashtags: ['#uno'],
    copyImagen: '',
  };

  it('guarda y recupera la edición de un bloque', () => {
    saveVersionEditState('bloque-1', estado);

    expect(getVersionEditState('bloque-1')?.cuerpo).toBe('cuerpo editado');
    expect(getVersionEditState('bloque-1')?.selectedIndex).toBe(1);
  });

  it('devuelve null para un bloque sin ediciones', () => {
    expect(getVersionEditState('bloque-nuevo')).toBeNull();
  });

  it('guarda cada bloque por separado', () => {
    saveVersionEditState('bloque-1', estado);
    saveVersionEditState('bloque-2', { ...estado, choice: 'B', cuerpo: 'otro cuerpo' });

    expect(getVersionEditState('bloque-1')?.choice).toBe('A');
    expect(getVersionEditState('bloque-2')?.choice).toBe('B');
  });

  it('sobrescribe la edición del mismo bloque', () => {
    saveVersionEditState('bloque-1', estado);
    saveVersionEditState('bloque-1', { ...estado, cuerpo: 'corregido' });

    expect(getVersionEditState('bloque-1')?.cuerpo).toBe('corregido');
  });

  it('aguanta un estado corrupto', () => {
    browser.storage.seedRaw('cm_version_edit_state', 'no es json');
    expect(getVersionEditState('bloque-1')).toBeNull();
  });

  it('hashContent identifica el mismo contenido igual, y distinto si cambia', () => {
    expect(hashContent('mismo texto')).toBe(hashContent('mismo texto'));
    expect(hashContent('un texto')).not.toBe(hashContent('otro texto'));
  });
});

describe('usage: contador del día (HU-14)', () => {
  it('empieza en cero', () => {
    expect(getUsageCount()).toBe(0);
    expect(hasReachedDailyLimit()).toBe(false);
  });

  it('cuenta cada propuesta', () => {
    expect(incrementUsage()).toBe(1);
    expect(incrementUsage()).toBe(2);
    expect(getUsageCount()).toBe(2);
  });

  it('avisa al llegar al límite del día', () => {
    for (let i = 0; i < DAILY_LIMIT; i++) incrementUsage();
    expect(hasReachedDailyLimit()).toBe(true);
  });

  it('se reinicia cuando cambia el día', () => {
    incrementUsage();
    browser.storage.seedRaw(USAGE_KEY, JSON.stringify({ date: '2020-01-01', count: 99 }));

    expect(getUsageCount()).toBe(0);
    expect(hasReachedDailyLimit()).toBe(false);
  });

  it('ignora un contador corrupto', () => {
    browser.storage.seedRaw(USAGE_KEY, '{roto');
    expect(getUsageCount()).toBe(0);
  });

  it('ignora un contador con forma inesperada', () => {
    browser.storage.seedRaw(USAGE_KEY, JSON.stringify({ date: '2026-10-25', count: 'muchas' }));
    expect(getUsageCount()).toBe(0);
  });

  it('resetUsage vuelve a cero', () => {
    incrementUsage();
    resetUsage();

    expect(getUsageCount()).toBe(0);
  });
});
