import { NextRequest, NextResponse } from 'next/server';
import { streamChatWithAgent } from '@/lib/anthropic';
import type { Message, ResponseSource } from '@/lib/anthropic-types';
import { buildMemorySummary } from '@/lib/agent-memory';
import { getSession } from '@/lib/auth';
import { getBrand } from '@/lib/brand';
import { demoResponseFor, streamDemoResponse } from '@/lib/demo-agent';
import { getServerEnv } from '@/lib/env';
import { createModelBudget } from '@/lib/model-budget';
import { createRateLimiter } from '@/lib/rate-limit';
import { chatRequestSchema, validateBody } from '@/lib/schemas';

/**
 * Conversación con el agente.
 *
 * Tres cosas que no estaban y ahora sí:
 *
 *  1. El cuerpo de la petición se valida (antes se reenviaba al modelo tal cual).
 *  2. Hay un presupuesto de llamadas al modelo por día y un límite por minuto y
 *     sesión, porque es el servidor el que paga (RNF-06).
 *  3. Si no hay clave de API o el presupuesto se agotó, responde el guion de
 *     demostración en vez de fallar, y lo dice en la cabecera `X-Agent-Source`.
 *
 * El resumen de preferencias se calcula en cada petición. Antes se guardaba en
 * una variable del módulo, compartida por todo el proceso e indexada por el
 * número de entradas: dos analistas con la misma cantidad de elecciones recibían
 * el resumen del otro. Calcularlo cuesta microsegundos; el error costaba la
 * privacidad del otro.
 */

const MAX_HISTORY_MESSAGES = 10;
const DEMO_CHUNK_DELAY_MS = 12;

const env = getServerEnv();

const modelBudget = createModelBudget({ limit: env.dailyModelCallBudget });
const chatLimiter = createRateLimiter({ maxAttempts: env.chatMaxPerMinute, windowSeconds: 60 });

function streamResponse(
  produce: (emit: (chunk: string) => void) => Promise<unknown>,
  source: ResponseSource,
  extraHeaders: Record<string, string> = {}
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // El analista puede recargar o cerrar la pestaña a mitad de la respuesta.
      // Cuando eso pasa, el canal se cierra y seguir escribiendo en él lanza un
      // error que no es un fallo del agente: es alguien que se fue. Se deja de
      // escribir en silencio en vez de registrar un error falso.
      let abierto = true;

      const emit = (chunk: string) => {
        if (!abierto) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          abierto = false;
        }
      };

      try {
        await produce(emit);
      } catch (error) {
        if (abierto) {
          console.error('[chat] fallo al generar la respuesta:', error);
          emit('\n\nHubo un error al generar la respuesta. Intenta de nuevo.');
        }
      } finally {
        if (abierto) {
          try {
            controller.close();
          } catch {
            // Ya estaba cerrado por el otro extremo.
          }
        }
      }
    },

    cancel() {
      // El cliente abandonó la lectura. No hay nada que limpiar: la llamada al
      // modelo ya está en curso y su cupo se contabilizó.
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Agent-Source': source,
      ...extraHeaders,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const limit = chatLimiter.check(session.username);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Vas muy rápido. Espera unos segundos y vuelve a intentar.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  }

  const parsed = validateBody(chatRequestSchema, body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { messages, agentContext, memoria } = parsed.data;
  const recentMessages: Message[] = messages.slice(-MAX_HISTORY_MESSAGES);
  const brand = getBrand();

  // Sin clave de API, o en modo demostración: guion local, sin llamar al modelo.
  if (env.useDemoAgent) {
    const text = demoResponseFor(recentMessages, brand);
    return streamResponse(
      (emit) => streamDemoResponse(text, emit, { delayMs: DEMO_CHUNK_DELAY_MS }),
      'demostracion',
      { 'X-Agent-Demo-Reason': env.demoMode ? 'modo-demo' : 'sin-clave' }
    );
  }

  const budget = modelBudget.consume();
  if (!budget.allowed) {
    const text = demoResponseFor(recentMessages, brand);
    return streamResponse(
      (emit) => streamDemoResponse(text, emit, { delayMs: DEMO_CHUNK_DELAY_MS }),
      'demostracion',
      { 'X-Agent-Demo-Reason': 'presupuesto-agotado' }
    );
  }

  const memorySummary = buildMemorySummary(memoria ?? []);

  return streamResponse(
    (emit) =>
      streamChatWithAgent(recentMessages, emit, { brand, agentContext, memorySummary }).catch(
        (error) => {
          // La llamada no llegó a producir respuesta: se devuelve el cupo.
          modelBudget.refund();
          throw error;
        }
      ),
    'modelo',
    { 'X-Model-Calls-Remaining': String(budget.remaining) }
  );
}
