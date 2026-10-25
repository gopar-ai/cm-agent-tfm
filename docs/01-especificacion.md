# 1 · Especificación

Qué resuelve CM Agent, para quién, y con qué criterios se da por hecha cada
funcionalidad. Es el documento que se escribió antes de tocar el código de esta
entrega, y el que manda cuando hay dudas sobre el alcance.

## 1.1 El problema

Una empresa B2B que vende servicios con ciclo de venta largo necesita publicar en
LinkedIn de forma constante. Quien lo hace —una analista de marketing, no un
equipo de contenido— se topa siempre con lo mismo:

- **La hoja en blanco.** Decidir *de qué* publicar cuesta más que escribirlo.
- **Lo que se publica envejece.** Sin seguir la actualidad del sector, el
  contenido es intemporal y, por tanto, poco relevante.
- **Cada herramienta de IA genérica empieza de cero.** Hay que volver a
  explicarle a quién le hablamos, con qué tono y qué no se dice, cada vez.
- **El estilo se pierde.** Lo que funcionó el mes pasado no queda registrado en
  ninguna parte.

## 1.2 La propuesta

Un agente conversacional especializado en una marca, que acompaña de la idea al
post publicable en cuatro fases, consulta la actualidad del sector mientras
propone, y **aprende del propio uso**: cada elección del analista (formato,
versión, estilo de titular) queda registrada y orienta las siguientes
propuestas, sin que nadie configure nada.

## 1.3 Actores

| Actor | Quién es | Qué espera |
|---|---|---|
| **Analista** | Quien lleva el contenido de la marca. Único usuario con sesión | Salir de la conversación con un post listo, en su tono |
| **Agente** | El modelo con su prompt, sus herramientas y el contexto de la marca | — |
| **Revisor / visitante** | Quien entra a probar la aplicación con el acceso de demostración | Ver el flujo completo funcionando, sin configurar nada |
| **Tarea programada** | El cron que refresca el feed de noticias | — |
| **Medios del sector** | Feeds RSS y resultados de búsqueda web | — |

## 1.4 Alcance

**Entra:** conversación en cuatro fases, feed de noticias, calendario de
contenido, memoria de preferencias, contexto de marca editable, acceso con
usuario y contraseña, modo de demostración.

**No entra, y es deliberado** (el porqué, en [03-diseno](03-diseno.md)):

- Publicar directamente en LinkedIn. Requiere revisión humana antes de publicar y
  una app aprobada por LinkedIn; el valor está en llegar al post, no en subirlo.
- Varios usuarios con roles. Es una herramienta de una analista por marca.
- Generar las imágenes. El agente entrega el *prompt* de la imagen; generarla es
  otro trabajo y otro costo.
- Base de datos. El estado vive en el navegador del analista, a propósito.

## 1.5 Historias de usuario

Prioridad: **(1)** imprescindible · **(2)** importante · **(3)** si da tiempo.

### Conversación con el agente

**HU-01 · Proponer temas** *(1)*
Como analista quiero que el agente me proponga temas al empezar, para no partir
de una hoja en blanco.
- **Dado** que abro una conversación nueva, **cuando** le pido empezar,
  **entonces** recibo 5 temas numerados, cada uno con una línea de por qué ahora.
- **Dado** que la lista ya se mostró, **cuando** pido más opciones, **entonces**
  los temas nuevos no repiten los anteriores.
- **Dado** un tema de actualidad, **cuando** se muestra, **entonces** lleva medio,
  fecha y enlace al artículo.

**HU-02 · Mezclar actualidad y fondo** *(1)*
Como analista quiero que al menos la mitad de los temas sean de actualidad real,
para que el contenido no sea intemporal.
- **Dado** que hay noticias del día o de ayer, **cuando** se arma la lista,
  **entonces** la mitad o más son de actualidad.
- **Dado** que no hay noticias frescas, **cuando** se arma la lista, **entonces**
  se completa con temas de fondo y **nunca** con noticias viejas disfrazadas.

**HU-03 · Ángulo antes de escribir** *(1)*
Como analista quiero ver el ángulo, el por qué ahora y la emoción objetivo antes
de que se escriba el post, para corregir el rumbo barato.
- **Dado** que elijo un tema, **cuando** el agente responde, **entonces** veo esas
  tres líneas y ninguna más.

**HU-04 · Dos versiones para comparar** *(1)*
Como analista quiero dos versiones distintas con tres titulares cada una, para
elegir en vez de pedir correcciones a ciegas.
- **Dado** que elijo un formato, **cuando** el agente responde, **entonces** recibo
  versión A y B, cada una con 3 titulares.
- **Dado** las dos versiones, **cuando** las comparo, **entonces** proponen ganchos
  distintos, no la misma idea con sinónimos.

**HU-05 · Cada formato con su estructura** *(1)*
Como analista quiero que el contenido se adapte al formato elegido (copy, copy +
imagen, carrusel, PDF, video), porque un carrusel no se escribe como un copy.
- **Dado** el formato "Copy + imagen", **cuando** recibo la propuesta, **entonces**
  incluye copy del post, texto de la imagen y prompt para generarla.
- **Dado** el formato "Carrusel", **cuando** recibo la propuesta, **entonces** viene
  dividida en diapositivas.

**HU-06 · Ajustar sin empezar de nuevo** *(1)*
Como analista quiero editar titulares y cuerpo, y pedir ajustes, sin que el
agente regenere todo.
- **Dado** que confirmo una versión, **cuando** pido un ajuste, **entonces** se
  aplica sobre esa versión y no sobre una nueva.
- **Dado** que edité un texto, **cuando** vuelvo a abrir la propuesta,
  **entonces** mis cambios siguen ahí.

**HU-07 · Contexto de marca editable** *(2)*
Como analista quiero editar el ICP, el tono y los temas prohibidos desde la
aplicación, para no depender de nadie cuando cambia la estrategia.
- **Dado** que guardo un contexto, **cuando** converso, **entonces** el agente lo
  respeta.
- **Dado** que lo restablezco, **cuando** vuelvo a abrir, **entonces** aparece el
  contexto por defecto de la marca.

**HU-08 · Memoria silenciosa** *(2)*
Como analista quiero que el agente aprenda de mis elecciones, para que cada vez
acierte más de primera.
- **Dado** que llevo 3 elecciones o más, **cuando** converso, **entonces** el
  agente las tiene en cuenta.
- **Dado** que llevo menos de 3, **cuando** converso, **entonces** no se inventa un
  patrón con tan poco.
- **Dado** que el agente aplica lo aprendido, **cuando** responde, **entonces** no
  lo menciona ni lo explica.

### Trabajo diario

**HU-09 · Varias propuestas en paralelo** *(2)*
Como analista quiero llevar varias propuestas abiertas, nombrarlas y fijar las
importantes, porque trabajo en varias campañas a la vez.
- **Dado** que escribo en una conversación, **cuando** vuelvo a la lista,
  **entonces** aparece arriba por ser la más reciente.
- **Dado** que fijo una, **cuando** veo la lista, **entonces** queda por delante de
  las no fijadas.

**HU-10 · Calendario de contenido** *(2)*
Como analista quiero programar un post en una fecha y ver el mes completo, para
sostener un ritmo de publicación.
- **Dado** un post listo, **cuando** lo programo, **entonces** aparece en el
  calendario en esa fecha.
- **Dado** un post del calendario, **cuando** lo marco como publicado,
  **entonces** pasa a la lista de publicados y ningún otro post cambia de estado.

**HU-11 · Feed de noticias del sector** *(2)*
Como analista quiero ver las noticias del sector junto al chat, para detectar
oportunidades sin salir de la herramienta.
- **Dado** que abro el panel, **cuando** carga el feed, **entonces** veo noticias
  recientes con medio y fecha.
- **Dado** que una noticia me sirve, **cuando** la guardo, **entonces** la
  encuentro después.
- **Dado** que una fuente está caída, **cuando** carga el feed, **entonces** se
  muestran las demás en vez de fallar entero.

**HU-14 · Saber cuánto llevo hoy** *(3)*
Como analista quiero ver cuántas propuestas hice hoy, para repartir el trabajo.

### Operación

**HU-12 · Probarlo sin configurar nada** *(1)*
Como alguien que llega al repositorio quiero probar el flujo completo sin clave
de API, para evaluar la herramienta antes de invertir en ella.
- **Dado** un clon recién hecho sin configuración, **cuando** lo arranco,
  **entonces** entro con las credenciales de desarrollo y recorro las cuatro
  fases.
- **Dado** el modo de demostración, **cuando** converso, **entonces** la interfaz
  se comporta igual que con el modelo real.
- **Dado** que se agotó el presupuesto diario de llamadas, **cuando** converso,
  **entonces** el agente sigue respondiendo y la aplicación lo declara.

**HU-13 · Llevarlo a otra marca** *(2)*
Como responsable quiero cambiar de marca y de fuentes por configuración, sin
tocar el código.
- **Dado** que configuro otra marca, **cuando** arranco, **entonces** el prompt, el
  contexto por defecto y la interfaz la nombran.
- **Dado** que configuro otros feeds, **cuando** carga el panel, **entonces** el
  feed viene de esas fuentes.

**HU-15 · Acceso controlado** *(1)*
Como responsable quiero que solo entre quien tiene credenciales, porque el
contexto de marca es información del negocio.
- **Dado** que no tengo sesión, **cuando** abro cualquier pantalla, **entonces**
  acabo en el acceso.
- **Dado** que fallo la contraseña varias veces, **cuando** insisto, **entonces** el
  sistema me frena un rato.
- **Dado** un usuario que no existe, **cuando** lo intento, **entonces** el mensaje
  es el mismo que con una contraseña equivocada.

## 1.6 Ambigüedades detectadas y cómo se resolvieron

| # | Duda | Resolución |
|---|---|---|
| A-01 | ¿Qué es "noticia fresca"? | Publicada hoy o ayer, comparando la fecha carácter por carácter. Sin esa regla dura, el modelo llamaba "reciente" a notas de semanas atrás |
| A-02 | ¿Qué pasa si no hay noticias frescas? | Se completa con temas de fondo, sin avisar en la respuesta: el analista quiere temas, no un informe de búsqueda |
| A-03 | ¿Cuántas elecciones hacen un patrón? | Tres. Con una o dos, el "patrón" es ruido |
| A-04 | ¿El estado es compartido o de cada quien? | De cada navegador. En la demo pública es además un requisito de privacidad |
| A-05 | ¿Quién paga las pruebas del revisor? | Hay presupuesto diario de llamadas; agotado, responde el guion de demostración |
| A-06 | ¿El contexto de marca puede dar instrucciones al agente? | No: entra como datos delimitados ([04-seguridad](04-seguridad.md)) |

## 1.7 Trazabilidad

Cada historia tiene pruebas que la respaldan; la tabla completa está en
[05-pruebas](05-pruebas.md#53-trazabilidad). Los requisitos técnicos con número
(RNF) están en [02-requisitos](02-requisitos.md).
