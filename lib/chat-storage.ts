import {
  emitChange,
  newId,
  readJson,
  readText,
  removeKey,
  subscribeToChange,
  writeJson,
  writeText,
} from './local-store';

/**
 * Conversaciones guardadas: cada propuesta es un chat con su nombre, su orden y
 * su historial.
 */

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type ChatSession = {
  id: string;
  name: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

const CHATS_KEY = 'cm_chats';
const COUNTER_KEY = 'cm_chat_counter';
const LEGACY_HISTORY_KEY = 'cm_chat_history';
const CHATS_EVENT = 'cm-chats-updated';

function nextChatNumber(): number {
  const current = Number(readText(COUNTER_KEY) ?? '0');
  const next = (Number.isFinite(current) ? current : 0) + 1;
  writeText(COUNTER_KEY, String(next));
  return next;
}

function writeChats(chats: ChatSession[]): void {
  writeJson(CHATS_KEY, chats);
  emitChange(CHATS_EVENT);
}

/**
 * Trae la conversación única de la primera versión de la app al formato de
 * varios chats. Se ejecuta una sola vez: después, la clave antigua ya no existe.
 */
function migrateLegacyHistory(): void {
  const legacy = readText(LEGACY_HISTORY_KEY);
  if (!legacy) return;
  removeKey(LEGACY_HISTORY_KEY);

  try {
    const messages = JSON.parse(legacy) as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) return;

    const chats = readJson<ChatSession[]>(CHATS_KEY, []);
    writeJson(CHATS_KEY, [
      {
        id: newId(),
        name: `Propuesta ${nextChatNumber()}`,
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages,
      },
      ...(Array.isArray(chats) ? chats : []),
    ]);
  } catch {
    // Historial antiguo corrupto: se descarta en silencio, ya quedó fuera.
  }
}

function readChats(): ChatSession[] {
  migrateLegacyHistory();
  const stored = readJson<ChatSession[]>(CHATS_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

/** Chats ordenados: primero los fijados, después por última actividad. */
export function getChats(): ChatSession[] {
  return readChats().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function getChat(id: string): ChatSession | null {
  return readChats().find((c) => c.id === id) ?? null;
}

export function createChat(): ChatSession {
  const chat: ChatSession = {
    id: newId(),
    name: `Propuesta ${nextChatNumber()}`,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  writeChats([chat, ...readChats()]);
  return chat;
}

function updateChat(id: string, change: (chat: ChatSession) => ChatSession): void {
  const chats = readChats();
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const next = [...chats];
  next[idx] = change(chats[idx]);
  writeChats(next);
}

/**
 * Marca de actividad estrictamente posterior a la de cualquier otra conversación.
 *
 * `Date.now()` tiene resolución de milisegundos: dos conversaciones creadas de
 * seguido comparten marca, y al escribir en la primera el orden no cambiaba
 * porque el empate dejaba la lista como estaba.
 */
function nextActivityStamp(chats: ChatSession[]): number {
  const latest = chats.reduce((max, chat) => Math.max(max, chat.updatedAt), 0);
  return Math.max(Date.now(), latest + 1);
}

export function updateChatMessages(id: string, messages: ChatMessage[]): void {
  const stamp = nextActivityStamp(readChats());
  updateChat(id, (chat) => ({ ...chat, messages, updatedAt: stamp }));
}

export function renameChat(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  updateChat(id, (chat) => ({ ...chat, name: trimmed }));
}

export function togglePinChat(id: string): void {
  updateChat(id, (chat) => ({ ...chat, pinned: !chat.pinned }));
}

export function deleteChat(id: string): void {
  writeChats(readChats().filter((c) => c.id !== id));
}

export function subscribeToChats(callback: () => void): () => void {
  return subscribeToChange(CHATS_EVENT, callback);
}

export { CHATS_KEY, COUNTER_KEY, LEGACY_HISTORY_KEY, CHATS_EVENT };
