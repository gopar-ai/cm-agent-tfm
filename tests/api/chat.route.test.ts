import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { Message } from '@/lib/anthropic-types';
import { parseTopics } from '@/lib/post-parser';

/**
 * Pruebas de la ruta del chat.
 *
 * El cliente de Anthropic se sustituye por un doble: estas pruebas comprueban el
 * comportamiento de la ruta —permisos, validación, límites, qué prompt se arma—
 * sin red y sin gastar un peso.
 */

let sesion: { username: string } | null = { username: 'analista' };

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

vi.mock('@/lib/auth', () => ({
  getSession: async () => sesion,
}));

const streamChatWithAgent = vi.fn(
  async (
    messages: Message[],
    onChunk: (chunk: string) => void,
    _options?: unknown
  ): Promise<string> => {
    onChunk('respuesta del modelo');
    return 'respuesta del modelo';
  }
);

vi.mock('@/lib/anthropic', () => ({ streamChatWithAgent }));

async function cargarRuta(env: Record<string, string> = {}) {
  vi.resetModules();
  streamChatWithAgent.mockClear();

  process.env.JWT_SECRET = 'x'.repeat(40);
  for (const [clave, valor] of Object.entries(env)) process.env[clave] = valor;

  const { resetServerEnvCache } = await import('@/lib/env');
  resetServerEnvCache();

  return (await import('@/app/api/chat/route')).POST;
}

function peticion(body: unknown) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const mensajes = [{ role: 'user' as const, content: 'empecemos' }];

afterEach(() => {
  sesion = { username: 'analista' };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.DAILY_MODEL_CALL_BUDGET;
  delete process.env.CHAT_MAX_PER_MINUTE;
  delete process.env.DEMO_MODE;
  delete process.env.JWT_SECRET;
});

describe('POST /api/chat: permisos y validación', () => {
  it('sin sesión responde 401 y no llama al modelo', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });
    sesion = null;

    const res = await POST(peticion({ messages: mensajes }));

    expect(res.status).toBe(401);
    expect(streamChatWithAgent).not.toHaveBeenCalled();
  });

  it('rechaza un cuerpo que no es JSON', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });
    expect((await POST(peticion('no es json'))).status).toBe(400);
  });

  it('rechaza una conversación vacía', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });
    expect((await POST(peticion({ messages: [] }))).status).toBe(400);
  });

  it('rechaza un mensaje desmedido sin llamar al modelo (RNF-04)', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const res = await POST(
      peticion({ messages: [{ role: 'user', content: 'x'.repeat(9000) }] })
    );

    expect(res.status).toBe(400);
    expect(streamChatWithAgent).not.toHaveBeenCalled();
  });

  it('corta las ráfagas de peticiones de la misma sesión (RNF-06)', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa', CHAT_MAX_PER_MINUTE: '2' });

    expect((await POST(peticion({ messages: mensajes }))).status).toBe(200);
    expect((await POST(peticion({ messages: mensajes }))).status).toBe(200);

    const bloqueado = await POST(peticion({ messages: mensajes }));
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.headers.get('Retry-After')).toBeTruthy();
  });
});

describe('POST /api/chat con el modelo real', () => {
  it('responde en streaming y marca el origen', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });
    const res = await POST(peticion({ messages: mensajes }));

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Agent-Source')).toBe('modelo');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    await expect(res.text()).resolves.toContain('respuesta del modelo');
  });

  it('recorta el historial a los últimos diez mensajes', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const largos = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `mensaje ${i}`,
    }));

    const res = await POST(peticion({ messages: largos }));
    await res.text();

    const enviados = streamChatWithAgent.mock.calls[0][0];
    expect(enviados).toHaveLength(10);
    expect(enviados[9].content).toBe('mensaje 24');
  });

  it('pasa el contexto del analista al prompt', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const res = await POST(peticion({ messages: mensajes, agentContext: '# ICP propio' }));
    await res.text();

    const opciones = streamChatWithAgent.mock.calls[0][2] as { agentContext?: string };
    expect(opciones.agentContext).toBe('# ICP propio');
  });

  it('no resume preferencias con menos de tres elecciones', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const res = await POST(
      peticion({
        messages: mensajes,
        memoria: [{ version_elegida: 'A', formato: 'Copy', tema: 'uno', titular_elegido: 't' }],
      })
    );
    await res.text();

    const opciones = streamChatWithAgent.mock.calls[0][2] as { memorySummary?: string | null };
    expect(opciones.memorySummary).toBeNull();
  });

  it('resume las preferencias cuando hay suficientes elecciones (HU-08)', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const memoria = Array.from({ length: 3 }, () => ({
      version_elegida: 'B' as const,
      formato: 'Carrusel',
      tema: 'custodia',
      titular_elegido: '¿Cuánto cuesta?',
    }));

    const res = await POST(peticion({ messages: mensajes, memoria }));
    await res.text();

    const opciones = streamChatWithAgent.mock.calls[0][2] as { memorySummary?: string | null };
    expect(opciones.memorySummary).toContain('Carrusel');
    expect(opciones.memorySummary).toContain('Versión preferida: B');
  });

  it('no mezcla las preferencias de dos analistas con el mismo número de elecciones', async () => {
    // Regresión del defecto corregido: el resumen se guardaba en una variable
    // del módulo indexada por el número de entradas, así que la segunda petición
    // recibía el resumen de la primera.
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    const memoriaDeUno = Array.from({ length: 3 }, () => ({
      version_elegida: 'A' as const,
      formato: 'Carrusel',
      tema: 'cadena de frío',
      titular_elegido: 'Una declaración',
    }));

    const memoriaDeOtro = Array.from({ length: 3 }, () => ({
      version_elegida: 'B' as const,
      formato: 'Documento PDF',
      tema: 'aduanas',
      titular_elegido: '¿Y si pasa hoy?',
    }));

    await (await POST(peticion({ messages: mensajes, memoria: memoriaDeUno }))).text();
    await (await POST(peticion({ messages: mensajes, memoria: memoriaDeOtro }))).text();

    const primero = streamChatWithAgent.mock.calls[0][2] as { memorySummary?: string | null };
    const segundo = streamChatWithAgent.mock.calls[1][2] as { memorySummary?: string | null };

    expect(primero.memorySummary).toContain('Carrusel');
    expect(segundo.memorySummary).toContain('Documento PDF');
    expect(segundo.memorySummary).not.toContain('Carrusel');
  });

  it('si el modelo falla, avisa en el propio stream y no rompe la petición', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });
    streamChatWithAgent.mockRejectedValueOnce(new Error('modelo caído'));

    const res = await POST(peticion({ messages: mensajes }));

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain('Hubo un error al generar la respuesta');
  });

  it('si el analista se va a mitad de la respuesta, no registra un error falso', async () => {
    // Lo detectó el recorrido en navegador: al recargar a mitad del streaming,
    // el canal se cierra y seguir escribiendo lanzaba
    // "Invalid state: Controller is already closed".
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa' });

    streamChatWithAgent.mockImplementationOnce(async (_messages, onChunk) => {
      for (let i = 0; i < 20; i++) {
        onChunk(`trozo ${i} `);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }
      return 'completo';
    });

    const res = await POST(peticion({ messages: mensajes }));
    const reader = res.body!.getReader();

    await reader.read();
    await reader.cancel(); // el analista recarga

    // Se deja tiempo a que el productor siga emitiendo sobre el canal cerrado.
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(console.error).not.toHaveBeenCalled();
  });

  it('informa cuántas llamadas quedan en el día', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa', DAILY_MODEL_CALL_BUDGET: '5' });

    const res = await POST(peticion({ messages: mensajes }));
    expect(res.headers.get('X-Model-Calls-Remaining')).toBe('4');
  });
});

describe('POST /api/chat en modo de demostración (HU-12)', () => {
  it('sin clave de API responde con el guion y lo declara', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion({ messages: mensajes }));

    expect(res.status).toBe(200);
    expect(res.headers.get('X-Agent-Source')).toBe('demostracion');
    expect(res.headers.get('X-Agent-Demo-Reason')).toBe('sin-clave');
    expect(streamChatWithAgent).not.toHaveBeenCalled();
  });

  it('el guion que entrega lo entiende la interfaz', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion({ messages: mensajes }));

    const texto = await res.text();
    expect(parseTopics(texto)?.topics).toHaveLength(5);
  });

  it('DEMO_MODE fuerza el guion aunque haya clave', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa', DEMO_MODE: 'true' });
    const res = await POST(peticion({ messages: mensajes }));

    expect(res.headers.get('X-Agent-Demo-Reason')).toBe('modo-demo');
    expect(streamChatWithAgent).not.toHaveBeenCalled();
  });

  it('al agotarse el presupuesto del día sigue atendiendo con el guion (RNF-06)', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa', DAILY_MODEL_CALL_BUDGET: '1' });

    const primera = await POST(peticion({ messages: mensajes }));
    expect(primera.headers.get('X-Agent-Source')).toBe('modelo');
    await primera.text();

    const segunda = await POST(peticion({ messages: mensajes }));
    expect(segunda.status).toBe(200);
    expect(segunda.headers.get('X-Agent-Source')).toBe('demostracion');
    expect(segunda.headers.get('X-Agent-Demo-Reason')).toBe('presupuesto-agotado');
    expect(streamChatWithAgent).toHaveBeenCalledTimes(1);
  });

  it('devuelve el cupo cuando la llamada al modelo no llegó a responder', async () => {
    const POST = await cargarRuta({ ANTHROPIC_API_KEY: 'sk-ant-falsa', DAILY_MODEL_CALL_BUDGET: '1' });

    streamChatWithAgent.mockRejectedValueOnce(new Error('modelo caído'));
    await (await POST(peticion({ messages: mensajes }))).text();

    // El intento fallido no debe consumir el presupuesto del día.
    const segunda = await POST(peticion({ messages: mensajes }));
    expect(segunda.headers.get('X-Agent-Source')).toBe('modelo');
  });
});
