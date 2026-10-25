'use client';

import { useState, useRef, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChatMessage from '@/components/ChatMessage';
import NewsFeed from '@/components/NewsFeed';
import LoadingBubble from '@/components/LoadingBubble';
import { hasReachedDailyLimit, incrementUsage, DAILY_LIMIT } from '@/lib/usage';
import {
  getChat,
  getChats,
  createChat,
  updateChatMessages,
  subscribeToChats,
  type ChatMessage as Message,
} from '@/lib/chat-storage';
import type { Topic } from '@/lib/post-parser';
import { getAgentContext, hasStoredAgentContext } from '@/lib/agent-context';
import { logVersionChoice } from '@/lib/version-choices';
import { getMemory, addMemoryEntry } from '@/lib/agent-memory';
import type { CalendarPost } from '@/lib/calendar-storage';

const KICKOFF_PROMPT =
  'Inicia la conversación proponiendo directamente entre 5 y 8 temas para LinkedIn, mezclando temas y actualidad. No redactes ningún post todavía.';

const LIMIT_MESSAGE: Message = {
  role: 'assistant',
  content: `Alcanzaste el límite de propuestas de hoy (${DAILY_LIMIT}). Vuelve mañana o contacta a Janette para ajustar el límite.`,
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatId = searchParams.get('chat');

  const [messages, setMessages] = useState<Message[]>([]);
  const [chatName, setChatName] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingLabels, setLoadingLabels] = useState<string[]>(['Generando']);
  const bottomRef = useRef<HTMLDivElement>(null);
  const kickedOffFor = useRef<string | null>(null);
  const currentTopicRef = useRef('');
  const currentFormatRef = useRef('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function resolveOrCreateChat(): { id: string } | null {
    const existing = getChats()[0];
    if (existing) return existing;
    if (hasReachedDailyLimit()) {
      setMessages([LIMIT_MESSAGE]);
      return null;
    }
    incrementUsage();
    return createChat();
  }

  useEffect(() => {
    if (!chatId) {
      const target = resolveOrCreateChat();
      if (!target) return;
      router.replace(`/dashboard?chat=${target.id}`);
      return;
    }

    const chat = getChat(chatId);
    if (!chat) {
      const target = resolveOrCreateChat();
      if (!target) return;
      router.replace(`/dashboard?chat=${target.id}`);
      return;
    }

    setChatName(chat.name);

    if (chat.messages.length > 0) {
      setMessages(chat.messages);
      kickedOffFor.current = chat.id;
      return;
    }

    setMessages([]);
    if (kickedOffFor.current === chat.id) return;
    kickedOffFor.current = chat.id;
    sendToAgent(chat.id, [], [{ role: 'user', content: KICKOFF_PROMPT }]);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    return subscribeToChats(() => {
      const chat = getChat(chatId);
      if (chat) setChatName(chat.name);
    });
  }, [chatId]);

  function shuffleArray<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getLoadingLabels(apiMessages: Message[]): string[] {
    const lastContent = apiMessages[apiMessages.length - 1]?.content ?? '';

    if (lastContent === KICKOFF_PROMPT) {
      return shuffleArray([
        'Buscando noticias y preparando propuestas',
        'Revisando fuentes de logística',
        'Filtrando por relevancia y fecha',
        'Armando la lista final',
        'Comparando ángulos posibles',
        'Cruzando noticias con temas evergreen',
        'Descartando lo que ya está viejo',
        'Ordenando las mejores opciones',
      ]);
    }

    if (lastContent.startsWith('Desarrolla el tema')) {
      return shuffleArray([
        'Analizando el tema',
        'Definiendo el ángulo',
        'Pensando en la emoción correcta',
        'Buscando el gancho adecuado',
        'Conectando con el dolor del cliente',
        'Eligiendo el enfoque más directo',
      ]);
    }

    if (lastContent.startsWith('Genera el formato')) {
      return shuffleArray([
        'Generando versiones del post',
        'Redactando los titulares',
        'Ajustando el copy',
        'Puliendo los detalles',
        'Buscando dos enfoques distintos',
        'Afinando el gancho de cada versión',
        'Revisando hashtags',
      ]);
    }

    return shuffleArray(['Generando', 'Procesando tu solicitud', 'Casi listo', 'Aplicando los ajustes', 'Revisando el resultado']);
  }

  function startFakeProgress() {
    setLoadingProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(95, progress + (95 - progress) * 0.15 + 1);
      setLoadingProgress(Math.round(progress));
    }, 200);
    return interval;
  }

  async function sendToAgent(targetChatId: string, visibleBase: Message[], apiMessages: Message[]) {
    setLoading(true);
    setLoadingLabels(getLoadingLabels(apiMessages));
    const progressInterval = startFakeProgress();
    let accumulated = '';
    const agentContext = hasStoredAgentContext() ? getAgentContext() : undefined;
    const memoria = getMemory();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, agentContext, memoria }),
      });

      if (!res.ok || !res.body) throw new Error('Error en la respuesta');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }

      const finalText = accumulated || 'No se recibió respuesta del agente.';
      const finalMessages: Message[] = [...visibleBase, { role: 'assistant', content: finalText }];
      setMessages(finalMessages);
      updateChatMessages(targetChatId, finalMessages);
    } catch {
      const finalMessages: Message[] = [
        ...visibleBase,
        { role: 'assistant', content: 'Hubo un error al procesar tu mensaje. Intenta de nuevo.' },
      ];
      setMessages(finalMessages);
      updateChatMessages(targetChatId, finalMessages);
    } finally {
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
      }, 200);
    }
  }

  async function submitUserMessage(content: string) {
    if (!content.trim() || loading || !chatId) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    const visibleBase = [...messages, userMessage];
    setMessages(visibleBase);
    await sendToAgent(chatId, visibleBase, visibleBase);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input;
    setInput('');
    await submitUserMessage(text);
  }

  function handleSelectTopic(topic: Topic) {
    currentTopicRef.current = topic.title;
    submitUserMessage(`Desarrolla el tema ${topic.number}: ${topic.title}`);
  }

  function handleSelectFormat(format: string) {
    currentFormatRef.current = format;
    submitUserMessage(`Genera el formato "${format}" para este tema: dos versiones (A y B).`);
  }

  function handleConfirmVersion(choice: 'A' | 'B', content: string, titulares: string[]) {
    logVersionChoice({
      tema: currentTopicRef.current,
      formato: currentFormatRef.current,
      version: choice,
      timestamp: Date.now(),
    });
    addMemoryEntry({
      tema: currentTopicRef.current,
      formato: currentFormatRef.current,
      version_elegida: choice,
      titular_elegido: titulares[0] ?? '',
      timestamp: Date.now(),
    });
    submitUserMessage(
      `Elijo la Versión ${choice}. Este es el contenido confirmado, a partir de aquí lo ajustamos si pido cambios:\n\n${content}`
    );
  }

  function handleSavePost(post: {
    titular: string;
    cuerpo: string;
    hashtags: string;
    promptImagen: string;
  }) {
    const saved: CalendarPost[] = JSON.parse(localStorage.getItem('cm_calendar') ?? '[]');
    const newPost: CalendarPost = {
      id: Date.now().toString(),
      ...post,
      fecha: new Date().toISOString().split('T')[0],
      status: 'borrador',
    };
    localStorage.setItem('cm_calendar', JSON.stringify([...saved, newPost]));
  }

  // El mensaje "Elijo la Versión..." y la confirmación breve que le sigue son solo
  // para que el agente tenga contexto en ajustes futuros — no se muestran en el chat,
  // ahí ya se ve el panel de edición dentro de la tarjeta de versiones.
  const visibleMessages = messages.filter((msg, i) => {
    if (msg.role === 'user' && msg.content.startsWith('Elijo la Versión')) return false;
    const prev = messages[i - 1];
    if (msg.role === 'assistant' && prev?.role === 'user' && prev.content.startsWith('Elijo la Versión')) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Chat column */}
      <div className="flex flex-col h-1/2 md:h-full md:w-[60%] border-b md:border-b-0 md:border-r border-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-900 shrink-0">
          <h1 className="text-white font-semibold text-sm truncate">{chatName || 'Chat con el agente'}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Genera y ajusta posts para LinkedIn</p>
        </div>

        {/* Loading progress bar */}
        {loading && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-zinc-500 text-xs">Generando…</span>
              <span className="text-[#CC0000] text-xs font-medium">{loadingProgress}%</span>
            </div>
            <div className="h-1 w-full bg-zinc-900 rounded overflow-hidden">
              <div
                className="h-full bg-[#CC0000] transition-all duration-200 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {visibleMessages.map((msg, i) => (
            <ChatMessage
              key={i}
              role={msg.role}
              content={msg.content}
              chatId={chatId ?? ''}
              onSavePost={msg.role === 'assistant' ? handleSavePost : undefined}
              onSelectTopic={msg.role === 'assistant' ? handleSelectTopic : undefined}
              onSelectFormat={msg.role === 'assistant' ? handleSelectFormat : undefined}
              onConfirmVersion={msg.role === 'assistant' ? handleConfirmVersion : undefined}
              disabled={loading}
            />
          ))}
          {loading && <LoadingBubble labels={loadingLabels} />}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 pb-4 pt-2 border-t border-zinc-900 shrink-0"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe aquí tu instrucción al agente…"
              disabled={loading}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm px-4 py-3 focus:outline-none focus:border-[#CC0000] transition-colors placeholder-zinc-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#CC0000] hover:bg-red-700 disabled:opacity-40 text-white px-4 py-3 rounded-lg transition-colors text-sm font-medium"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>

      {/* News feed column */}
      <div className="h-1/2 md:h-full md:w-[40%] overflow-hidden">
        <NewsFeed onUseForPost={submitUserMessage} />
      </div>
    </div>
  );
}
