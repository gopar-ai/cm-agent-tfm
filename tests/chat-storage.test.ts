import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CHATS_KEY,
  createChat,
  deleteChat,
  getChat,
  getChats,
  LEGACY_HISTORY_KEY,
  renameChat,
  subscribeToChats,
  togglePinChat,
  updateChatMessages,
} from '@/lib/chat-storage';
import { installBrowser } from './helpers/browser';

describe('chat-storage (HU-09)', () => {
  let browser: ReturnType<typeof installBrowser>;

  beforeEach(() => {
    browser = installBrowser();
  });

  afterEach(() => {
    browser.uninstall();
  });

  it('empieza sin conversaciones', () => {
    expect(getChats()).toEqual([]);
  });

  it('crea una conversación con nombre numerado', () => {
    const chat = createChat();

    expect(chat.name).toBe('Propuesta 1');
    expect(chat.messages).toEqual([]);
    expect(chat.pinned).toBe(false);
  });

  it('numera cada conversación nueva', () => {
    createChat();
    createChat();
    expect(createChat().name).toBe('Propuesta 3');
  });

  it('da un identificador distinto a cada conversación', () => {
    expect(createChat().id).not.toBe(createChat().id);
  });

  it('recupera una conversación por su identificador', () => {
    const chat = createChat();
    expect(getChat(chat.id)?.id).toBe(chat.id);
    expect(getChat('no-existe')).toBeNull();
  });

  it('guarda los mensajes de una conversación', () => {
    const chat = createChat();
    updateChatMessages(chat.id, [{ role: 'user', content: 'hola' }]);

    expect(getChat(chat.id)?.messages).toHaveLength(1);
  });

  it('ignora mensajes de una conversación que no existe', () => {
    expect(() => updateChatMessages('fantasma', [{ role: 'user', content: 'hola' }])).not.toThrow();
    expect(getChats()).toHaveLength(0);
  });

  it('ordena las conversaciones por última actividad', () => {
    const primera = createChat();
    const segunda = createChat();

    updateChatMessages(primera.id, [{ role: 'user', content: 'actividad nueva' }]);

    expect(getChats()[0].id).toBe(primera.id);
    expect(getChats()[1].id).toBe(segunda.id);
  });

  it('pone las fijadas por delante', () => {
    const primera = createChat();
    const segunda = createChat();

    togglePinChat(primera.id);

    expect(getChats()[0].id).toBe(primera.id);
    expect(getChat(segunda.id)?.pinned).toBe(false);
  });

  it('quita el fijado al volver a pulsarlo', () => {
    const chat = createChat();

    togglePinChat(chat.id);
    togglePinChat(chat.id);

    expect(getChat(chat.id)?.pinned).toBe(false);
  });

  it('renombra una conversación', () => {
    const chat = createChat();
    renameChat(chat.id, '  Campaña de octubre  ');

    expect(getChat(chat.id)?.name).toBe('Campaña de octubre');
  });

  it('no acepta un nombre vacío', () => {
    const chat = createChat();
    renameChat(chat.id, '   ');

    expect(getChat(chat.id)?.name).toBe('Propuesta 1');
  });

  it('borra una conversación sin tocar las demás', () => {
    const primera = createChat();
    const segunda = createChat();

    deleteChat(primera.id);

    expect(getChats()).toHaveLength(1);
    expect(getChats()[0].id).toBe(segunda.id);
  });

  it('avisa a la interfaz cuando la lista cambia', () => {
    let avisos = 0;
    const desuscribir = subscribeToChats(() => avisos++);

    createChat();
    expect(avisos).toBe(1);

    desuscribir();
    createChat();
    expect(avisos).toBe(1);
  });

  it('devuelve lista vacía si lo guardado está corrupto', () => {
    browser.storage.seedRaw(CHATS_KEY, 'no es json');
    expect(getChats()).toEqual([]);
  });

  it('convierte el historial de la primera versión en una conversación', () => {
    browser.storage.seedRaw(
      LEGACY_HISTORY_KEY,
      JSON.stringify([
        { role: 'user', content: 'mensaje viejo' },
        { role: 'assistant', content: 'respuesta vieja' },
      ])
    );

    const chats = getChats();

    expect(chats).toHaveLength(1);
    expect(chats[0].messages).toHaveLength(2);
    // La migración corre una sola vez: la clave antigua desaparece.
    expect(browser.storage.getItem(LEGACY_HISTORY_KEY)).toBeNull();
  });

  it('no crea nada si el historial antiguo está vacío o corrupto', () => {
    browser.storage.seedRaw(LEGACY_HISTORY_KEY, '[]');
    expect(getChats()).toEqual([]);

    browser.storage.seedRaw(LEGACY_HISTORY_KEY, '{roto');
    expect(getChats()).toEqual([]);
  });
});
