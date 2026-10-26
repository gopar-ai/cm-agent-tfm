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
 * El contenido es el de la marca de ejemplo —una empresa de software B2B—, y
 * los medios y enlaces son inventados a propósito, con el dominio reservado
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

  return `1. 🤖 Siete de cada diez equipos de producto ya usan IA a diario — Actualidad
El informe salió hoy y pone número a algo que tus clientes ya están viviendo.
Fecha: ${hoy}
Fuente: Reporte Tech
[ver noticia](https://reportetech.example/ia-equipos-producto)

2. 🔌 Por qué las integraciones deciden el cambio de plataforma — Tema
La razón real por la que un equipo migra, y casi nunca aparece en el pitch.

3. ⚖️ Entra en vigor la nueva ley de datos para empresas de software — Actualidad
Publicada ayer: cambia lo que tus clientes pueden guardar y dónde.
Fecha: ${ayer}
Fuente: Datos Hoy
[ver noticia](https://datoshoy.example/ley-datos-personales)

4. ☁️ El costo oculto de un dato que nadie consulta — Tema
Habla del dolor sin vender producto: lo que se paga por almacenar ruido.

5. 📊 Qué mide un equipo de datos que sí influye en el negocio — Tema
Separa las métricas que se presentan de las que de verdad cambian decisiones.

¿Cuál desarrollamos? Escribe el número.`;
}

function angleResponse(): string {
  return `---ANGULO---
🎯 Ángulo
El problema no es adoptar IA: es no saber qué datos le estás dando.

💡 Por qué ahora
El informe de hoy dice que ya la usan siete de cada diez, y casi nadie audita con qué.

🎭 Emoción objetivo
Urgencia controlada: la de revisar algo hoy, no la de alarmarse.
---FIN_ANGULO---`;
}

function versionsResponse(brand: Brand, format: string): string {
  const isCopyWithImage = format === 'Copy + imagen';

  const cuerpoA = `🤖 Siete de cada diez equipos de producto ya usan IA todos los días.

La pregunta interesante no es si la usan. Es con qué datos.

En la mayoría de los equipos que conozco, el modelo recibe lo que alguien pegó en un prompt: una exportación vieja, una tabla sin permisos, un campo que nadie sabía que tenía datos personales.

Adoptar IA sin saber qué entra no es ir rápido. Es firmar un cheque en blanco.

Antes de la próxima integración, responde dos cosas: qué datos toca y quién aprobó que los tocara. 🔐`;

  const cuerpoB = `📊 Un equipo nos enseñó su panel de IA. Doce métricas, todas en verde.

Les preguntamos cuál les había hecho cambiar una decisión el último mes.

Silencio.

Un dato que no cambia una decisión no es información: es decoración cara. Y en datos, la decoración se paga por gigabyte almacenado y por hora de ingeniería mantenida.

Si tu panel tiene doce métricas, empieza por tachar las que nadie mira. 🔌`;

  const contentA = isCopyWithImage
    ? `COPY DEL POST:
${cuerpoA}
HASHTAGS: #InteligenciaArtificial #DatosEmpresariales #ProductoDigital

COPY DE LA IMAGEN:
¿CON QUÉ DATOS ESTÁS ENTRENANDO?

PROMPT PARA IMAGEN:
Fondo oscuro con una malla de nodos conectados apenas visible, texto blanco grande centrado, paleta negro/rojo/blanco, estilo editorial tecnológico, sin personas.`
    : `CUERPO:
${cuerpoA}
HASHTAGS: #InteligenciaArtificial #DatosEmpresariales #ProductoDigital`;

  const contentB = isCopyWithImage
    ? `COPY DEL POST:
${cuerpoB}
HASHTAGS: #Datos #Analitica #EquiposDeProducto

COPY DE LA IMAGEN:
DOCE MÉTRICAS. CERO DECISIONES.

PROMPT PARA IMAGEN:
Fondo negro, panel de gráficas apagadas salvo una encendida en rojo, texto blanco grande, estilo profesional minimalista.`
    : `CUERPO:
${cuerpoB}
HASHTAGS: #Datos #Analitica #EquiposDeProducto`;

  return `---VERSIONES---
FORMATO: ${format}
---VERSION A---
TITULO: La pregunta que nadie hace antes de adoptar IA
TITULARES:
1. Siete de cada diez equipos ya usan IA. ¿Con qué datos?
2. Adoptar IA sin auditar los datos es firmar en blanco
3. Dos preguntas antes de tu próxima integración
CONTENIDO:
${contentA}
---FIN VERSION A---
---VERSION B---
TITULO: Doce métricas en verde y ninguna decisión
TITULARES:
1. Un panel con doce métricas y ninguna decisión
2. El dato que no cambia nada es decoración cara
3. Empieza por tachar las métricas que nadie mira
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
TITULAR: Siete de cada diez equipos ya usan IA. ¿Con qué datos?
CUERPO:
🤖 Siete de cada diez equipos de producto ya usan IA todos los días.

La pregunta interesante no es si la usan. Es con qué datos.

Adoptar IA sin saber qué entra no es ir rápido. Es firmar un cheque en blanco.

Antes de la próxima integración, responde dos cosas: qué datos toca y quién aprobó que los tocara. 🔐
HASHTAGS: #InteligenciaArtificial #DatosEmpresariales #ProductoDigital
PROMPT_IMAGEN: Fondo oscuro, malla de nodos conectados, texto blanco grande, paleta negro/rojo/blanco.
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
