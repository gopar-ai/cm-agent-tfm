# 7 · Trabajo con IA

Dos cosas distintas, y conviene no mezclarlas: **la IA dentro del producto** (el
agente que usa la analista) y **la IA para construir el producto** (cómo se
escribió este código).

## 7.1 La IA dentro del producto

### Un modelo por tarea

| Tarea | Modelo | Por qué |
|---|---|---|
| Conversar con la analista | `claude-sonnet-4-6` | Tiene que seguir un prompt largo con reglas de formato estrictas, mantener el hilo entre fases y escribir con criterio editorial |
| Buscar noticias del sector | `claude-haiku-4-5` | Solo extrae titulares, medios y fechas, y los devuelve en JSON. No necesita criterio, necesita ser barato y rápido |

Usar el modelo grande para el feed costaba alrededor de un orden de magnitud
más por búsqueda, para la misma lista de titulares. La decisión no fue
"elegir el mejor modelo", sino **elegir el modelo más barato que hace bien cada
tarea**, que es lo que permite que el feed se refresque a diario sin pensar en
la factura.

### Herramientas que tiene el agente

Una sola: búsqueda web nativa (`web_search`), acotada a **3 usos por turno** en el
chat y 18 en el refresco del feed (una tarea que corre una vez al día y sí
conviene que busque a fondo).

El agente **no** publica, no envía correos y no borra nada. Produce texto que una
persona decide usar. Eso no es una limitación técnica: es la decisión de diseño
que mantiene el riesgo acotado (LLM08, agencia excesiva, en
[04-seguridad](04-seguridad.md)).

### Cómo se controla el costo

| Medida | Dónde | Qué evita |
|---|---|---|
| Prompt del sistema compacto | `lib/anthropic.ts` | Cada token del prompt se paga en **cada** mensaje de la conversación |
| Historial acotado a 10 mensajes | `app/api/chat/route.ts` | Que una conversación larga multiplique el costo de cada turno |
| Techo por mensaje y por conversación | `lib/schemas.ts` | Que un cliente mande cien mil caracteres a costa de la cuenta |
| Búsquedas acotadas por turno | `lib/anthropic.ts` | Que el modelo encadene búsquedas sin control |
| Caché del feed: memoria y disco | `app/api/news/route.ts` | Repetir la búsqueda del día en cada visita |
| Presupuesto diario de llamadas | `lib/model-budget.ts` | Que un pico de uso se convierta en una factura sorpresa |
| Caída al guion de demostración | `lib/demo-agent.ts` | Que agotar el presupuesto deje la aplicación inservible |
| Modelo pequeño donde alcanza | `lib/news.ts` | Pagar criterio donde solo hace falta extracción |

### Cómo se consigue que el modelo responda en un formato que la interfaz entienda

El agente no devuelve JSON: devuelve texto con **bloques delimitados**
(`---ANGULO---`, `---VERSIONES---`, `---POST---`) que el parser reconoce para
dibujar tarjetas con botones.

Se eligió así porque la respuesta llega **en streaming**: el analista ve el texto
aparecer mientras se genera. Un JSON a medio generar no se puede mostrar; un
bloque de texto sí. El precio es que el formato hay que pedirlo con insistencia
en el prompt, y que el parser tiene que tolerar que el modelo se salga del
formato —por eso devuelve `null` en vez de lanzar, y por eso es la pieza con más
pruebas.

Tres reglas del prompt que salieron de ver al modelo fallar en uso real:

1. **Fechas comparadas carácter por carácter.** Pedirle "noticias recientes" hacía
   que llamara reciente a una nota de hace tres semanas. Lo que funciona es
   darle las dos fechas exactas y exigir coincidencia literal.
2. **"Nunca muestres tu verificación".** El modelo tendía a explicar su proceso
   ("revisé las fechas y no hay noticias de hoy, así que…"). La analista quiere
   la lista, no el informe.
3. **Semilla de variación.** Con el mismo prompt, las propuestas se parecían
   demasiado entre conversaciones. Un número aleatorio en el prompt, con la
   instrucción de variar orden y ángulos, rompe el patrón. En las pruebas la
   semilla se inyecta, para que el prompt sea estable y comparable.

### Qué pasa cuando el modelo falla

| Fallo | Comportamiento |
|---|---|
| Se sale del formato | La interfaz muestra el texto plano; no se cae |
| No devuelve texto | Error explícito y se devuelve el cupo al presupuesto |
| Se agota el presupuesto | Responde el guion de demostración, declarado en la cabecera `X-Agent-Source` |
| Falla la búsqueda del feed | El feed se arma con los RSS; si tampoco hay, lista vacía y el chat sigue |

## 7.2 La IA para construir el producto

Este proyecto se desarrolló con Claude Code como par de programación, y
conviene decir con precisión qué hizo cada parte.

**Lo que hizo la IA:** escribir el código de los módulos nuevos, las 374
pruebas, el Dockerfile, la integración continua y esta documentación. Auditar el
código existente y encontrar los ocho hallazgos de seguridad. Proponer la
separación en módulos puros.

**Lo que no:** decidir. El alcance, qué se corrige y qué se documenta como deuda,
qué proyecto se entrega y qué queda fuera son decisiones que se tomaron a mano,
y varias veces en contra de la primera propuesta de la IA.

**Dónde fue más útil:** en el trabajo mecánico y exhaustivo que un humano hace mal
por aburrimiento. Las pruebas de validación de URL contra SSRF, una por rango, con sus
rangos privados y sus IPv6, son el mejor ejemplo: nadie las escribe completas a
mano un domingo.

**Dónde se equivocó, y cómo se detectó:** dos veces dio por buena una
implementación que las pruebas tumbaron después.

1. El guion de demostración reconocía los mensajes de la interfaz **por su
   cuenta**, con su propia copia de las frases. Funcionaba en las pruebas
   unitarias —que usaban frases inventadas— y fallaba en el navegador, donde la
   interfaz manda las frases de verdad. El arreglo fue estructural:
   `lib/agent-messages.ts` pone el contrato en un solo sitio, y una tabla de
   pruebas recorre **todos** los mensajes que la interfaz puede enviar.
2. El mensaje de configuración inválida no nombraba la variable que faltaba. Lo
   destapó una prueba que esperaba leer `JWT_SECRET` en el error.

La lección que queda escrita en el código: **la prueba que vale es la que usa el
dato real, no el que resulta cómodo de inventar.**

**Trazabilidad del trabajo con IA:** cada módulo nuevo lleva un comentario de
cabecera que explica *por qué* existe y qué problema concreto resuelve —varios
nombran el defecto que corrigen—. No es documentación decorativa: es lo que
permite que alguien que llegue dentro de seis meses entienda una decisión sin
preguntarle a nadie.
