'use client';

import Icono from '@/components/Icono';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getUsageCount, subscribeToUsageChanges, hasReachedDailyLimit, incrementUsage, DAILY_LIMIT } from '@/lib/usage';
import {
  getChats,
  createChat,
  renameChat,
  togglePinChat,
  deleteChat,
  subscribeToChats,
  type ChatSession,
} from '@/lib/chat-storage';
import { getPublishedPosts, subscribeToPublished, type CalendarPost } from '@/lib/calendar-storage';

const NAV = [{ href: '/calendar', label: 'Calendario', icon: 'calendario' as const }];
const CONFIG_LINK = { href: '/dashboard/config', label: 'Configuración', icon: 'ajustes' as const };

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function formatShortDateFromISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${MONTH_ABBR[m - 1]}`;
}

function displayChatName(chat: ChatSession): string {
  if (/^Propuesta \d+$/.test(chat.name)) {
    return `${chat.name} · ${formatShortDate(chat.createdAt)}`;
  }
  return chat.name;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function Sidebar() {
  return (
    <Suspense fallback={<aside className="w-16 md:w-52 bg-zinc-950 border-r border-zinc-900 shrink-0" />}>
      <SidebarContent />
    </Suspense>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeChatId = searchParams.get('chat');
  const router = useRouter();
  const [usageCount, setUsageCount] = useState(0);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [published, setPublished] = useState<CalendarPost[]>([]);

  useEffect(() => {
    setUsageCount(getUsageCount());
    return subscribeToUsageChanges(() => setUsageCount(getUsageCount()));
  }, []);

  useEffect(() => {
    setChats(getChats());
    return subscribeToChats(() => setChats(getChats()));
  }, []);

  useEffect(() => {
    setPublished(getPublishedPosts());
    return subscribeToPublished(() => setPublished(getPublishedPosts()));
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function handleNewProposal() {
    if (hasReachedDailyLimit()) {
      window.alert(`Alcanzaste el límite de propuestas de hoy (${DAILY_LIMIT}). Vuelve mañana.`);
      return;
    }
    incrementUsage();
    const chat = createChat();
    router.push(`/dashboard?chat=${chat.id}`);
  }

  function commitRename(id: string, name: string) {
    renameChat(id, name);
    setRenamingId(null);
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`¿Eliminar la propuesta "${name}"? Esta acción no se puede deshacer.`)) return;
    deleteChat(id);
    if (activeChatId === id) router.push('/dashboard');
  }

  const sortedPublished = [...published].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <aside className="w-16 md:w-52 flex flex-col bg-zinc-950 border-r border-zinc-900 shrink-0">
      {/* Branding · es además el camino de vuelta al panel, como en cualquier
          aplicación web: el logo lleva al inicio. */}
      <div className="px-4 py-5 border-b border-zinc-900">
        <Link
          href="/dashboard"
          aria-label="Ir al panel principal"
          className="block rounded transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a66c2]"
        >
          <div className="flex items-center gap-2">
            <span className="text-[#0a66c2] font-black text-xl">CM</span>
            <span className="hidden md:block text-white font-light text-xl">Agent</span>
          </div>
          <p className="hidden md:block text-zinc-600 text-xs mt-0.5">Contenido para LinkedIn</p>
        </Link>
      </div>

      {/* Nueva propuesta */}
      <div className="px-2 pt-3">
        <button
          onClick={handleNewProposal}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm btn-acento text-white font-medium transition-colors"
        >
          <span>+</span>
          <span className="hidden md:block">Nueva propuesta</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="py-2 space-y-1 px-2">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                active
                  ? 'bg-[#1d2126] text-white font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-[#1d2126]'
              }`}
            >
              <Icono nombre={icon} className="w-4 h-4 shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Propuestas */}
      <div className="hidden md:block px-3 pt-2 pb-1">
        <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Propuestas</p>
      </div>
      <div className="hidden md:flex flex-col gap-0.5 px-2 max-h-[320px] overflow-y-auto">
        {chats.map((chat) => {
          const active = pathname === '/dashboard' && activeChatId === chat.id;
          const isRenaming = renamingId === chat.id;
          return (
            <div
              key={chat.id}
              className={`group flex items-center gap-1 px-2 py-2 rounded text-xs ${
                active ? 'bg-[#1d2126] text-white' : 'text-zinc-500 hover:bg-[#171a1e] hover:text-[#c9ced4]'
              }`}
            >
              {isRenaming ? (
                <input
                  autoFocus
                  defaultValue={chat.name}
                  onBlur={(e) => commitRename(chat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(chat.id, e.currentTarget.value);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-1 py-0.5 text-white text-xs focus:outline-none min-w-0"
                />
              ) : (
                <Link
                  href={`/dashboard?chat=${chat.id}`}
                  className="flex-1 truncate"
                  title={displayChatName(chat)}
                >
                  {chat.pinned && (
                    <Icono nombre="alfiler" className="inline w-3 h-3 mr-1 -mt-0.5" />
                  )}
                  {displayChatName(chat)}
                </Link>
              )}
              {!isRenaming && (
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => togglePinChat(chat.id)}
                    title={chat.pinned ? 'Desfijar' : 'Fijar'}
                    aria-label={chat.pinned ? 'Desfijar' : 'Fijar'}
                    className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-[#242830] transition-colors"
                  >
                    <Icono nombre="alfiler" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRenamingId(chat.id)}
                    title="Renombrar"
                    aria-label="Renombrar"
                    className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-[#242830] transition-colors"
                  >
                    <Icono nombre="escribir" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(chat.id, chat.name)}
                    title="Eliminar"
                    aria-label="Eliminar"
                    className="p-0.5 rounded text-zinc-500 hover:text-[#f87171] hover:bg-[#242830] transition-colors"
                  >
                    <Icono nombre="papelera" className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Publicados */}
      {sortedPublished.length > 0 && (
        <>
          <div className="hidden md:block px-3 pt-3 pb-1 border-t border-zinc-900 mt-2">
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Publicados</p>
          </div>
          <div className="hidden md:flex flex-col gap-0.5 px-2 max-h-[160px] overflow-y-auto">
            {sortedPublished.map((post) => (
              <Link
                key={post.id}
                href={`/calendar?postId=${post.id}`}
                title={post.titular}
                className="px-2 py-2 rounded text-xs text-zinc-500 hover:bg-[#171a1e] hover:text-[#c9ced4] truncate transition-colors"
              >
                {truncate(post.titular, 25)} · {formatShortDateFromISO(post.fecha)}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Spacer para anclar lo siguiente al fondo */}
      <div className="flex-1 min-h-0" />

      {/* Configuración */}
      <div className="px-2 pt-2 border-t border-zinc-900">
        <Link
          href={CONFIG_LINK.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
            pathname === CONFIG_LINK.href
              ? 'bg-[#1d2126] text-white font-medium'
              : 'text-zinc-400 hover:text-white hover:bg-[#1d2126]'
          }`}
        >
          <Icono nombre={CONFIG_LINK.icon} className="w-4 h-4 shrink-0" />
          <span className="hidden md:block">{CONFIG_LINK.label}</span>
        </Link>
      </div>

      {/* Usage counter */}
      <div className="px-3 py-2 border-t border-zinc-900">
        <p className="hidden md:block text-zinc-500 text-xs">
          Propuestas de hoy: {usageCount}/{DAILY_LIMIT}
        </p>
        <p className="md:hidden text-zinc-500 text-[10px] text-center">
          {usageCount}/{DAILY_LIMIT}
        </p>
      </div>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-900">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm text-zinc-500 hover:text-white hover:bg-[#1d2126] transition-colors"
        >
          <Icono nombre="salir" className="w-4 h-4" />
          <span className="hidden md:block">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
