/**
 * Los mensajes que la interfaz envía en nombre del analista.
 *
 * Cuando el analista pulsa "Elegir este tema" no escribe nada: la interfaz
 * redacta el mensaje. Esas frases son un contrato con el agente, porque el
 * prompt describe cómo reaccionar a cada una ("si el mensaje empieza con Elijo
 * la Versión…").
 *
 * Estaban escritas a mano en la pantalla del chat y reconocidas aparte en el
 * guion de demostración. Con el contrato en dos sitios, el guion respondía con
 * un post cuando debía responder con el ángulo. Aquí se construyen y se
 * reconocen en el mismo archivo, y hay pruebas que recorren el viaje completo.
 */

export type AgentPhase = 'temas' | 'angulo' | 'versiones' | 'confirmacion' | 'ajuste';

/** Formatos que ofrece la interfaz, con su emoji. */
export const FORMAT_OPTIONS = [
  '📝 Copy',
  '📸 Copy + imagen',
  '🎠 Carrusel',
  '📄 Documento PDF',
  '🎬 Video (guión)',
] as const;

/** Nombres de formato sin emoji, del más específico al más general. */
export const FORMAT_NAMES = ['Copy + imagen', 'Copy', 'Carrusel', 'Documento PDF', 'Video'] as const;

// --- Construcción -----------------------------------------------------------

/**
 * Mensaje con el que arranca una conversación nueva.
 *
 * Lo manda la interfaz sola, sin que el analista escriba: al abrir una
 * propuesta, el agente ya está proponiendo temas.
 */
export const KICKOFF_MESSAGE =
  'Inicia la conversación proponiendo directamente entre 5 y 8 temas para LinkedIn, mezclando temas y actualidad. No redactes ningún post todavía.';

export function buildTopicMessage(number: number, title: string): string {
  return `Desarrolla el tema ${number}: ${title}`;
}

export function buildFormatMessage(format: string): string {
  return `Genera el formato "${format}" para este tema: dos versiones (A y B).`;
}

export function buildConfirmMessage(choice: 'A' | 'B', content: string): string {
  return `Elijo la Versión ${choice}. Este es el contenido confirmado, a partir de aquí lo ajustamos si pido cambios:\n\n${content}`;
}

export function buildMoreTopicsMessage(): string {
  return 'Dame más opciones de temas.';
}

// --- Reconocimiento ---------------------------------------------------------

/**
 * ¿Es el mensaje con el que la interfaz confirma una versión?
 *
 * La pantalla del chat lo usa para no mostrar ese mensaje ni la confirmación que
 * le sigue: están ahí para que el agente tenga contexto en ajustes posteriores,
 * no para que el analista los lea.
 */
export function isConfirmMessage(text: string): boolean {
  return /^elijo la versi[oó]n/i.test((text ?? '').trim());
}

function stripEmojis(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
}

/** Nombre de formato que menciona el mensaje, si hay alguno. */
export function detectFormat(message: string): string | null {
  const clean = stripEmojis(message).toLowerCase();
  return FORMAT_NAMES.find((name) => clean.includes(name.toLowerCase())) ?? null;
}

/**
 * Deduce la fase a partir del último mensaje del analista.
 *
 * El orden de las comprobaciones importa: un título de tema puede contener la
 * palabra "video", así que elegir tema se comprueba antes que elegir formato.
 */
export function detectPhase(lastUserMessage: string): AgentPhase {
  const text = (lastUserMessage ?? '').trim();
  const clean = stripEmojis(text).toLowerCase();

  if (/^elijo la versi[oó]n/.test(clean)) return 'confirmacion';
  if (/^desarrolla el tema\b/.test(clean) || /^\d+$/.test(clean)) return 'angulo';

  // El arranque automático y las peticiones de más opciones piden lista de temas.
  // Se comprueba antes del formato porque el texto del arranque menciona
  // "temas para LinkedIn" y podría colarse por otra rama.
  if (
    !clean ||
    clean === stripEmojis(KICKOFF_MESSAGE).toLowerCase() ||
    /inicia la conversaci[oó]n|propon(?:iendo|me|) .*temas|m[aá]s (opciones|temas)|otros temas|empecemos|hola/.test(
      clean
    )
  ) {
    return 'temas';
  }

  if (detectFormat(text)) return 'versiones';
  return 'ajuste';
}
