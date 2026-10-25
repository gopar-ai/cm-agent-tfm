import type { Brand } from './brand';
import type { Message } from './anthropic-types';
import { detectFormat, detectPhase } from './agent-messages';

/**
 * Guion de demostración del agente.
 *
 * Reproduce el flujo de cuatro fases con el mismo formato de salida que el
 * modelo real, sin llamar a ninguna API. Sirve para tres cosas:
 *
 *  1. Que cualquiera pueda clonar el repositorio y probar el flujo completo sin
 *     una clave de Anthropic (HU-12).
 *  2. Que la demo publicada siga siendo utilizable cuando se agota el
 *     presupuesto diario de llamadas al modelo (RNF-06).
 *  3. Que las pruebas de punta a punta corran sin red y sin costo, siempre con
 *     la misma respuesta.
 *
 * Los medios y enlaces son inventados a propósito y usan el dominio reservado
 * `.example` (RFC 2606): un guion de demostración no debe fabricar enlaces que
 * parezcan de medios reales.
 */


function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function topicsResponse(brand: Brand, now: Date): string {
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hoy = formatDate(now);
  const ayer = formatDate(yesterday);

  return `1. 🚨 Tres rutas concentran la mitad del robo de carga del trimestre — Actualidad
El reporte trimestral salió hoy y nombra corredores donde tus clientes mueven mercancía.
Fecha: ${hoy}
Fuente: Reporte Carga
[ver noticia](https://reportecarga.example/robo-carga-corredores)

2. 📦 Custodia armada o sin arma: cómo se decide de verdad — Tema
La pregunta que todo gerente de logística hace en la primera llamada.

3. ❄️ Lo que cuesta una hora fuera de temperatura — Tema
Pone número al riesgo en cadena de frío, donde el daño no se ve hasta la entrega.

4. 🛡️ Nuevas reglas de operación para el autotransporte — Actualidad
Publicadas ayer: cambian requisitos de seguridad que afectan a tus clientes.
Fecha: ${ayer}
Fuente: Logística Hoy
[ver noticia](https://logisticahoy.example/reglas-autotransporte)

5. 💰 El costo oculto de no tener trazabilidad en ruta — Tema
Habla del dolor sin vender servicio: lo que no se mide, no se reclama.

¿Cuál desarrollamos? Escribe el número.`;
}

function angleResponse(): string {
  return `---ANGULO---
🎯 Ángulo
No es el robo lo que quiebra la operación: es enterarse tarde.

💡 Por qué ahora
El reporte del trimestre acaba de poner números a rutas que tus clientes usan a diario.

🎭 Emoción objetivo
Urgencia controlada: preocupación que empuja a revisar, no a paralizarse.
---FIN_ANGULO---`;
}

function versionsResponse(brand: Brand, format: string): string {
  const isCopyWithImage = format === 'Copy + imagen';

  const contentA = isCopyWithImage
    ? `COPY DEL POST:
🚨 Tres rutas concentran la mitad del robo de carga de este trimestre.

No es mala suerte. Es un patrón que ya se puede anticipar.

La mayoría de las operaciones se enteran del incidente cuando el cliente llama a preguntar por su entrega. Horas después. Cuando ya no hay nada que hacer.

La diferencia no la hace tener custodia. La hace saber, en el minuto uno, que algo se salió de la ruta.

Si mueves mercancía de valor por esos corredores, revisa dos cosas esta semana: cuánto tardas en detectar una desviación, y a quién le llega esa alerta. 🛡️
HASHTAGS: #SeguridadLogistica #RoboDeCarga #CadenaDeSuministro

COPY DE LA IMAGEN:
TE ENTERAS CUANDO YA NO HAY NADA QUE HACER

PROMPT PARA IMAGEN:
Fondo oscuro con textura de asfalto nocturno, tráiler desenfocado al fondo, texto blanco grande centrado, paleta negro/rojo/blanco, estilo editorial profesional, sin personas.`
    : `CUERPO:
🚨 Tres rutas concentran la mitad del robo de carga de este trimestre.

No es mala suerte. Es un patrón que ya se puede anticipar.

La mayoría de las operaciones se enteran del incidente cuando el cliente llama a preguntar por su entrega. Horas después. Cuando ya no hay nada que hacer.

La diferencia no la hace tener custodia. La hace saber, en el minuto uno, que algo se salió de la ruta.

Si mueves mercancía de valor por esos corredores, revisa dos cosas esta semana: cuánto tardas en detectar una desviación, y a quién le llega esa alerta. 🛡️
HASHTAGS: #SeguridadLogistica #RoboDeCarga #CadenaDeSuministro`;

  const contentB = isCopyWithImage
    ? `COPY DEL POST:
📦 Un cliente nos preguntó cuánto cuesta la custodia.

Le devolvimos otra pregunta: ¿cuánto cuesta una hora sin saber dónde está su carga?

Nadie presupuesta eso. Pero ahí está: la llamada al cliente final, la penalización por incumplimiento, el seguro que tarda semanas, el contrato que no se renueva.

El reporte de este trimestre señala tres corredores con la mitad de los incidentes. Si tu operación pasa por ahí, el cálculo ya no es hipotético.

Compara las dos cifras antes de decidir. 🛡️
HASHTAGS: #RiesgoLogistico #TransporteDeCarga #SupplyChain

COPY DE LA IMAGEN:
¿CUÁNTO CUESTA UNA HORA SIN SABER DÓNDE ESTÁ?

PROMPT PARA IMAGEN:
Fondo negro, silueta de contenedor con línea roja de ruta interrumpida, texto blanco grande, paleta negro/rojo/blanco, estilo profesional minimalista.`
    : `CUERPO:
📦 Un cliente nos preguntó cuánto cuesta la custodia.

Le devolvimos otra pregunta: ¿cuánto cuesta una hora sin saber dónde está su carga?

Nadie presupuesta eso. Pero ahí está: la llamada al cliente final, la penalización por incumplimiento, el seguro que tarda semanas, el contrato que no se renueva.

El reporte de este trimestre señala tres corredores con la mitad de los incidentes. Si tu operación pasa por ahí, el cálculo ya no es hipotético.

Compara las dos cifras antes de decidir. 🛡️
HASHTAGS: #RiesgoLogistico #TransporteDeCarga #SupplyChain`;

  return `---VERSIONES---
FORMATO: ${format}
---VERSION A---
TITULO: Enterarse tarde es el verdadero costo
TITULARES:
1. Tres rutas concentran la mitad del robo de carga
2. El problema no es el robo: es el aviso que llega tarde
3. ¿Cuánto tardas en saber que tu carga se salió de ruta?
CONTENIDO:
${contentA}
---FIN VERSION A---
---VERSION B---
TITULO: La cuenta que nadie presupuesta
TITULARES:
1. Nos preguntaron cuánto cuesta la custodia
2. La hora que no aparece en ningún presupuesto
3. Dos cifras que conviene comparar antes de decidir
CONTENIDO:
${contentB}
---FIN VERSION B---
---FIN VERSIONES---`;
}

function confirmationResponse(): string {
  return 'Lista: quedó guardada esa versión. Dime qué ajustamos o pásala al calendario.';
}

function adjustmentResponse(): string {
  return `---POST---
TITULAR: Tres rutas concentran la mitad del robo de carga
CUERPO:
🚨 Tres rutas concentran la mitad del robo de carga de este trimestre.

No es mala suerte. Es un patrón que ya se puede anticipar.

La diferencia no la hace tener custodia. La hace saber, en el minuto uno, que algo se salió de la ruta.

Revisa dos cosas esta semana: cuánto tardas en detectar una desviación, y a quién le llega esa alerta. 🛡️
HASHTAGS: #SeguridadLogistica #RoboDeCarga #CadenaDeSuministro
PROMPT_IMAGEN: Fondo oscuro, carretera nocturna, texto blanco grande, paleta negro/rojo/blanco.
---FIN---`;
}

/**
 * Respuesta de demostración para la conversación recibida.
 * `now` se inyecta para que las pruebas no dependan de la fecha del día.
 */
export function demoResponseFor(messages: Message[], brand: Brand, now: Date = new Date()): string {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  switch (detectPhase(lastUser)) {
    case 'temas':
      return topicsResponse(brand, now);
    case 'angulo':
      return angleResponse();
    case 'versiones':
      return versionsResponse(brand, detectFormat(lastUser) ?? 'Copy');
    case 'confirmacion':
      return confirmationResponse();
    case 'ajuste':
      return adjustmentResponse();
  }
}

/**
 * Entrega un texto por trozos, imitando el streaming del modelo para que la
 * interfaz se comporte igual en modo demostración.
 */
export async function streamDemoResponse(
  text: string,
  onChunk: (delta: string) => void,
  { chunkSize = 24, delayMs = 0 }: { chunkSize?: number; delayMs?: number } = {}
): Promise<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    onChunk(text.slice(i, i + chunkSize));
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return text;
}
