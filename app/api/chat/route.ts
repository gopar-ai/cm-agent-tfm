import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { streamChatWithAgent, Message } from '@/lib/anthropic';
import { buildMemorySummary, type MemoryEntry } from '@/lib/agent-memory';

const MAX_HISTORY_MESSAGES = 10;

// Caché del resumen de preferencias: solo se recalcula si el número de
// entradas en cm_memoria cambió desde la última solicitud.
let cachedMemoryCount = -1;
let cachedMemorySummary: string | null = null;

function getMemorySummary(memoria?: MemoryEntry[]): string | null {
  const count = memoria?.length ?? 0;
  if (count !== cachedMemoryCount) {
    cachedMemorySummary = buildMemorySummary(memoria ?? []);
    cachedMemoryCount = count;
  }
  return cachedMemorySummary;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const {
    messages,
    agentContext,
    memoria,
  }: { messages: Message[]; agentContext?: string; memoria?: MemoryEntry[] } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Mensajes inválidos' }, { status: 400 });
  }

  const recentMessages =
    messages.length > MAX_HISTORY_MESSAGES ? messages.slice(-MAX_HISTORY_MESSAGES) : messages;

  const memorySummary = getMemorySummary(memoria);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChatWithAgent(
          recentMessages,
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
          agentContext,
          memorySummary
        );
      } catch {
        controller.enqueue(encoder.encode('\n\nHubo un error al generar la respuesta. Intenta de nuevo.'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
