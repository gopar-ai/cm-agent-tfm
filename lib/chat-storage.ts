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
  const current = Number(localStorage.getItem(COUNTER_KEY) ?? '0');
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

function readChats(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyHistory();
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function writeChats(chats: ChatSession[]): void {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  window.dispatchEvent(new Event(CHATS_EVENT));
}

function migrateLegacyHistory(): void {
  const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
  if (!legacy) return;
  localStorage.removeItem(LEGACY_HISTORY_KEY);
  try {
    const messages = JSON.parse(legacy) as ChatMessage[];
    if (!Array.isArray(messages) || messages.length === 0) return;
    const existing = localStorage.getItem(CHATS_KEY);
    const chats: ChatSession[] = existing ? JSON.parse(existing) : [];
    chats.unshift({
      id: crypto.randomUUID(),
      name: `Propuesta ${nextChatNumber()}`,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
    });
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // ignore corrupted legacy data
  }
}

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
  const chats = readChats();
  const chat: ChatSession = {
    id: crypto.randomUUID(),
    name: `Propuesta ${nextChatNumber()}`,
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  writeChats([chat, ...chats]);
  return chat;
}

export function updateChatMessages(id: string, messages: ChatMessage[]): void {
  const chats = readChats();
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return;
  chats[idx] = { ...chats[idx], messages, updatedAt: Date.now() };
  writeChats(chats);
}

export function renameChat(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const chats = readChats();
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return;
  chats[idx] = { ...chats[idx], name: trimmed };
  writeChats(chats);
}

export function togglePinChat(id: string): void {
  const chats = readChats();
  const idx = chats.findIndex((c) => c.id === id);
  if (idx === -1) return;
  chats[idx] = { ...chats[idx], pinned: !chats[idx].pinned };
  writeChats(chats);
}

export function deleteChat(id: string): void {
  writeChats(readChats().filter((c) => c.id !== id));
}

export function subscribeToChats(callback: () => void): () => void {
  window.addEventListener(CHATS_EVENT, callback);
  return () => window.removeEventListener(CHATS_EVENT, callback);
}
