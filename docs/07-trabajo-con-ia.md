# 7 · Trabajo con IA

Dos cosas distintas, y conviene no mezclarlas: **la IA dentro del producto** —el
agente que usa la analista— y **la IA como herramienta de desarrollo**, que es
cómo se construyó esta entrega.

## 7.1 Cómo se desarrolló este proyecto

Este proyecto se construyó **dirigiendo a un agente de IA**, que es exactamente
la competencia que enseña el máster. No es un atajo: es la forma de trabajo, y
el resultado depende por completo de la calidad de la dirección.

Conviene decirlo con precisión, porque las dos exageraciones son falsas: ni el
código se escribió a mano línea por línea, ni "lo hizo la IA sola".

### Quién decidió qué

| Decisión | Quién | Qué pasó |
|---|---|---|
| **Qué proyecto se entrega** | Dirección | Se descartó una primera propuesta —un bot de Slack— tras comprobar que un evaluador externo no podría probarlo: habría necesitado su propia app de Slack, su clave de pago y un CRM con datos reales |
| **Qué proyecto NO se entrega** | Dirección | Se descartó también un sistema propio más grande y más vistoso, porque publicarlo exponía la operación real y datos de clientes. Se eligió el proyecto evaluable por encima del impresionante |
| **Que nada lleve datos de cliente** | Dirección | De ahí salen la marca por configuración, el modo de demostración y que las capturas se graben contra la demo |
| **Que no se gaste dinero** | Dirección | De ahí salen el presupuesto diario de llamadas, el guion de demostración y que la integración continua no consuma ni un token |
| **Qué se corrige y qué se documenta como deuda** | Dirección | Con la entrega a un día, se decidió corregir lo que afecta a la seguridad y al comportamiento, y dejar escrita —con su plan— la deuda de interfaz (DT-01 a DT-05 en [03-diseno](03-diseno.md)) |
| **Arquitectura, código, pruebas y documentación** | Agente de IA | Bajo esas restricciones, y revisado contra ellas |
| **Auditoría de seguridad** | Agente de IA | Los ocho hallazgos de [04-seguridad](04-seguridad.md) |
| **Verificación final contra las bases** | Dirección | Se pidió un cotejo explícito, punto por punto, antes de dar nada por entregado. De ahí salieron las slides en PDF y el mapa de requisitos del README |

### Las reglas de trabajo que marcaron el resultado

No son una anécdota: cada una está detrás de una decisión técnica concreta.

1. **Nada se ejecuta sin aprobación previa.** Publicar el repositorio,
   desplegar, usar una cuenta: todo se propuso antes y se esperó el visto bueno.
2. **Herramientas gratuitas.** La narración del vídeo, el montaje, las capturas
   y el despliegue se resolvieron sin pagar nada.
3. **Separación estricta entre marcas y proyectos.** Esta regla detectó un error
   real: los commits se estaban firmando con la cuenta equivocada, y la
   dirección lo vio antes de que quedara publicado.
4. **Lo que se afirma, se comprueba.** Cada cifra de esta documentación sale de
   ejecutar el comando, no de recordarlo.

### Dónde fue más útil la IA

En el trabajo exhaustivo que una persona hace mal por aburrimiento: las pruebas
de validación de URL contra SSRF, con sus rangos privados y sus IPv6; los casos
límite de datos corruptos; la batería de regresión de cada defecto.

### Dónde se equivocó, y cómo se detectó

Tres veces dio por bueno algo que no lo era. Las tres están documentadas porque
enseñan más que los aciertos:

1. **El guion de demostración reconocía los mensajes de la interfaz por su
   cuenta**, con su propia copia de las frases. Pasaba las pruebas unitarias
   —que usaban frases inventadas— y fallaba en el navegador, donde la interfaz
   manda las frases de verdad. El arreglo fue estructural: `lib/agent-messages.ts`
   deja el contrato en un solo sitio, con una tabla de pruebas que lo recorre
   entero.
2. **El mensaje de configuración inválida no nombraba la variable que faltaba.**
   Lo destapó una prueba que esperaba leer `JWT_SECRET` en el error.
3. **La autoría de los commits apuntaba a la cuenta equivocada.** No lo detectó
   ninguna prueba: lo vio la dirección al revisar el repositorio publicado.

La lección que quedó escrita en el código: **la prueba que vale es la que usa el
dato real, no el que resulta cómodo de inventar.** Y la que quedó fuera del
código: **lo que la IA no sabe que importa, hay que mirarlo a mano.**

### Qué queda como criterio propio

El agente propone; la dirección decide qué entra. Las decisiones de
[03-diseno](03-diseno.md) —el estado en el navegador en vez de una base de
datos, el modo de demostración como parte del producto, los límites en memoria
en vez de Redis— se tomaron sopesando alternativas y asumiendo su costo, y cada
una lleva escrito qué se pierde con ella. Eso no lo decide una herramienta.

## 7.2 La IA dentro del producto

### Un modelo por tarea

| Tarea | Modelo | Por qué |
|---|---|---|
| Conversar con la analista | `claude-sonnet-4-6` | Tiene que seguir un prompt largo con reglas de formato estrictas, mantener el hilo entre fases y escribir con criterio editorial |
| Buscar noticias del sector | `claude-haiku-4-5` | Solo extrae titulares, medios y fechas, y los devuelve en JSON. No necesita criterio, necesita ser barato y rápido |

Usar el modelo grande para el feed costaba alrededor de un orden de magnitud más
por búsqueda, para la misma lista de titulares. La decisión no fue "elegir el
mejor modelo", sino **el más barato que hace bien cada tarea**, que es lo que
permite refrescar el feed a diario sin pensar en la factura.

### Herramientas que tiene el agente

Una sola: búsqueda web nativa (`web_search`), acotada a **3 usos por turno** en
el chat y 18 en el refresco del feed, que corre una vez al día y sí conviene que
busque a fondo.

El agente **no** publica, no envía correos y no borra nada. Produce texto que una
persona decide usar. No es una limitación técnica: es la decisión que mantiene el
riesgo acotado (LLM08, agencia excesiva, en [04-seguridad](04-seguridad.md)).

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

Se eligió así porque la respuesta llega **en streaming**: la analista ve el texto
aparecer mientras se genera. Un JSON a medio generar no se puede mostrar; un
bloque de texto sí. El precio es que el formato hay que pedirlo con insistencia
en el prompt, y que el parser tiene que tolerar que el modelo se salga de él
—por eso devuelve `null` en vez de lanzar, y por eso es la pieza con más
pruebas.

Tres reglas del prompt que salieron de ver al modelo fallar en uso real:

1. **Fechas comparadas carácter por carácter.** Pedirle "noticias recientes"
   hacía que llamara reciente a una nota de hace tres semanas. Lo que funciona es
   darle las dos fechas exactas y exigir coincidencia literal.
2. **"Nunca muestres tu verificación".** El modelo tendía a explicar su proceso
   ("revisé las fechas y no hay noticias de hoy, así que…"). La analista quiere
   la lista, no el informe.
3. **Semilla de variación.** Con el mismo prompt, las propuestas se parecían
   demasiado entre conversaciones. Un número aleatorio, con la instrucción de
   variar orden y ángulos, rompe el patrón. En las pruebas la semilla se inyecta,
   para que el prompt sea estable y comparable.

### Qué pasa cuando el modelo falla

| Fallo | Comportamiento |
|---|---|
| Se sale del formato | La interfaz muestra el texto plano; no se cae |
| No devuelve texto | Error explícito y se devuelve el cupo al presupuesto |
| Se agota el presupuesto | Responde el guion de demostración, declarado en la cabecera `X-Agent-Source` |
| Falla la búsqueda del feed | El feed se arma con los RSS; si tampoco hay, lista vacía y el chat sigue |
