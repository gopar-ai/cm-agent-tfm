import { z } from 'zod';
import { MAX_UNTRUSTED_LENGTH } from './prompt-safety';

/**
 * Esquemas de entrada de la API.
 *
 * Las rutas leían el cuerpo de la petición con `await req.json()` y lo usaban
 * directo. Un cliente podía mandar cien mensajes de cien mil caracteres y el
 * servidor los reenviaba al modelo: factura ajena y respuesta lenta. Validar
 * aquí pone el techo en un solo lugar (RNF-04).
 */

export const MAX_MESSAGES = 40;
export const MAX_MESSAGE_LENGTH = 8000;
export const MAX_MEMORY_ENTRIES = 200;

export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const memoryEntrySchema = z.object({
  tema: z.string().max(300).default(''),
  formato: z.string().max(100).default(''),
  version_elegida: z.enum(['A', 'B']),
  titular_elegido: z.string().max(400).default(''),
  timestamp: z.number().finite().nonnegative().default(0),
});

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  agentContext: z.string().max(MAX_UNTRUSTED_LENGTH * 2).optional(),
  memoria: z.array(memoryEntrySchema).max(MAX_MEMORY_ENTRIES).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const loginRequestSchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/**
 * Valida un cuerpo ya convertido a objeto y devuelve un resultado uniforme,
 * con un mensaje en español listo para la respuesta HTTP.
 */
export function validateBody<S extends z.ZodTypeAny>(
  schema: S,
  body: unknown
): { ok: true; data: z.infer<S> } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };

  const first = result.error.issues[0];
  const path = first?.path.join('.');
  return { ok: false, error: path ? `Campo inválido: ${path}` : 'Petición inválida' };
}
