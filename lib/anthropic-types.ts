/**
 * Tipos del diálogo con el modelo.
 *
 * Viven aparte de `lib/anthropic.ts` porque ese módulo instancia el cliente del
 * SDK al importarse: quien solo necesita el tipo (el guion de demostración, las
 * pruebas, los componentes) no debería arrastrar esa dependencia.
 */

export type Message = { role: 'user' | 'assistant'; content: string };

/** Qué generó la respuesta que se devolvió al analista. */
export type ResponseSource = 'modelo' | 'demostracion';
