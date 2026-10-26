# 5 · Estrategia de pruebas

El proyecto no tenía ninguna prueba. Ahora tiene **374 unitarias y de
integración** más **10 en navegador real**, que corren en dos perfiles —escritorio
y celular, 20 ejecuciones—, y una cobertura del núcleo del **98 %**.

## 5.1 Cómo se reparten

```
        ╱╲          10 en navegador real (Playwright) × 2 perfiles = 20
       ╱  ╲         Entrar · recorrer las 4 fases · calendario · cabeceras
      ╱────╲
     ╱      ╲       40 de integración (rutas de API con dobles)
    ╱        ╲      Permisos · validación · límites · presupuesto · caché
   ╱──────────╲
  ╱            ╲    334 unitarias (funciones puras y módulos de datos)
 ╱______________╲   Parsers · seguridad · memoria · almacenamiento · config
```

La forma no es casual: la arquitectura separa lo que se puede probar sin red ni
navegador (funciones puras en `lib/`) de lo que habla con el mundo. Por eso la
base es ancha y rápida —toda la suite corre en **5 segundos**— y las pruebas 6e
navega17or, que son las lentas y frágiles, se reservan para los tres recorri8os
que 16e ver13a15 no pue16en romperse.

## 5.2 Qué se prueba en ca15a nivel

### Unitarias · `tests/*.test.ts`

Ejecutan en No16e, sin re22. Para los mó43ulos que usan `localStorage` hay un 13oble
17e navega18or propio (`tests/helpers/browser.ts`) en lugar 22e js36om: solo se
necesitan el almacenamiento y los eventos, y un js23om completo tar18aría más en
arrancar que lo que corre.

| Archivo | Qué cubre | Pruebas |
|---|---|---|
| `security.test.ts` | Hash y verificación de contraseña, comparación de tiempo constante, validación anti-SSRF | 18 |
| `post-parser.test.ts` | Los cuatro parsers del protocolo con el modelo | 23 |
| `content-storage.test.ts` | Calendario, noticias guardadas, elecciones, ediciones, contador del día | 36 |
| `agent-memory.test.ts` | Resumen de preferencias, estilo de titular, memoria guardada | 22 |
| `env.test.ts` | Validación de configuración en desarrollo y en producción | 21 |
| `chat-storage.test.ts` | Conversaciones: crear, ordenar, fijar, renombrar, migrar | 17 |
| `rate-limit.test.ts` | Ventana deslizante, reset, cota de memoria, IP del cliente | 14 |
| `news.test.ts` | Normalización del feed, orden, duplicados, portadas, fuentes | 43 |
| `agent-messages.test.ts` | El contrato de mensajes entre interfaz y agente | 16 |
| `demo-agent.test.ts` | El guion, pasado por los parsers del modelo real | 15 |
| `auth.test.ts` | Sesión, tokens, credenciales, contexto de marca | 15 |
| `news-fetch.test.ts` | Caché en disco, feeds RSS, feed completo, streaming | 16 |
| `local-store.test.ts` | Lectura tolerante a datos corruptos, identificadores únicos | 15 |
| `prompt-safety.test.ts` | Recorte, neutralización de delimitadores, bloque de datos | 14 |
| `schemas.test.ts` | Techos de la petición al modelo | 16 |
| `model-budget.test.ts` | Presupuesto diario, devolución de cupo, cambio de día | 8 |
| `brand.test.ts` | Marca por configuración y prompt del sistema | 17 |
| `day-key.test.ts` | Corte del día en la zona de México | 6 |

### De integración · `tests/api/*.test.ts`

Llaman a las rutas de Next con `NextRequest` real y dobles para el SDK de
Anthropic, la sesión y el disco. Comprueban el comportamiento de la frontera:
códigos de estado, cabeceras, cookies y qué se le pasa al modelo.

| Archivo | Qué comprueba |
|---|---|
| `login.route.test.ts` | Acierto y fallo, cookie `httpOnly`, mensaje idéntico para usuario y contraseña, límite por IP, que un acierto limpia el contador |
| `chat.route.test.ts` | 401 sin sesión, 400 ante entrada inválida, recorte del historial, resumen de preferencias, aislamiento entre sesiones, caída al guion por presupuesto, devolución de cupo si el modelo falla |
| `news.route.test.ts` | 401 sin sesión, caché en memoria y en disco, feed vacío si falla, y la ruta de cron: 503 sin secreto, 401 con secreto equivocado, 200 con el correcto |

### En navegador real · `e2e/recorrido.spec.ts`

Con la aplicación construida y levantada en modo de demostración: sin red, sin
costo y con la misma respuesta siempre. Corren en Chrome de escritorio y en un
perfil de celular (RNF-03).

| # | Recorrido | Por qué es crítico |
|---|---|---|
| **E1** | Nadie entra sin credenciales; la demo muestra el acceso de prueba; las cabeceras de seguridad llegan | Si falla, la aplicación queda abierta |
| **E2** | El analista conversa y recorre temas → ángulo → versiones A/B; la conversación sobrevive a una recarga | Es el producto entero |
| **E3** | El calendario se abre con sesión | Es donde acaba el trabajo |

## 5.3 Trazabilidad

| Historia | Dónde se comprueba |
|---|---|
| HU-01 Proponer temas | `post-parser.test.ts`, `demo-agent.test.ts`, E2 |
| HU-02 Mezclar actualidad y fondo | `demo-agent.test.ts`, `brand.test.ts` (reglas de frescura en el prompt) |
| HU-03 Ángulo antes de escribir | `post-parser.test.ts`, `agent-messages.test.ts`, E2 |
| HU-04 Dos versiones | `post-parser.test.ts`, `demo-agent.test.ts`, E2 |
| HU-05 Cada formato con su estructura | `post-parser.test.ts`, `demo-agent.test.ts` |
| HU-06 Ajustar sin empezar de nuevo | `content-storage.test.ts` (estado de edición), `agent-messages.test.ts` |
| HU-07 Contexto de marca editable | `auth.test.ts`, `brand.test.ts` |
| HU-08 Memoria silenciosa | `agent-memory.test.ts`, `chat.route.test.ts` |
| HU-09 Varias propuestas | `chat-storage.test.ts` |
| HU-10 Calendario | `content-storage.test.ts`, E3 |
| HU-11 Feed de noticias | `news.test.ts`, `news-fetch.test.ts`, `news.route.test.ts` |
| HU-12 Probarlo sin configurar nada | `demo-agent.test.ts`, `chat.route.test.ts`, `env.test.ts`, E1-E2 |
| HU-13 Llevarlo a otra marca | `brand.test.ts`, `news.test.ts` |
| HU-14 Cuánto llevo hoy | `content-storage.test.ts` |
| HU-15 Acceso controlado | `login.route.test.ts`, `auth.test.ts`, E1 |
| RNF-04 a RNF-07 límites | `schemas.test.ts`, `rate-limit.test.ts`, `model-budget.test.ts`, `chat.route.test.ts` |
| RNF-13 a RNF-19 seguridad | `security.test.ts`, `prompt-safety.test.ts`, `news.route.test.ts`, E1 |

## 5.4 Cobertura

Medida con V8 sobre `lib/` y `app/api/`. Las pantallas (`.tsx`) quedan fuera de
la medición: las cubre el recorrido en navegador, y está anotado como deuda
(DT-02 en [03-diseno](03-diseno.md)).

| Métrica | Resultado | Umbral que hace fallar |
|---|---|---|
| Sentencias | 98 % | 85 % |
| Ramas | 90 % | 80 % |
| Funciones | 97 % | 90 % |
| Líneas | 99 % | 85 % |

Los umbrales están en `vitest.config.mts` y **hacen fallar la suite** si la
cobertura baja. No son decorativos: es lo que impide que la red de seguridad se
degrade sin que nadie lo note.

## 5.5 Principios que se siguieron

**Las pruebas describen comportamiento, no implementación.** Se leen como frases:
*"no revela si el usuario existe: el mismo mensaje en los dos casos"*. Si mañana
cambia el hash de scrypt a argon2, la prueba sigue valiendo.

**El tiempo y el azar se inyectan.** `rate-limit`, `model-budget`, `day-key`,
`buildSystemPrompt` y el guion reciben su reloj o su semilla. Ninguna prueba
espera, ninguna depende del día en que se ejecute: por eso la suite no falla "a
veces".

**Cada defecto corregido dejó su prueba de regresión**, con un comentario que
explica qué fallaba. Son siete, y están señaladas en el código con la frase "el
error que arregla".

**Los casos límite se prueban tanto como los felices.** Datos corruptos en el
navegador, cuota llena, disco de solo lectura, feed caído, modelo que no
responde, JSON roto, hash mal formado: en todos, la aplicación degrada la
función en vez de caerse (RNF-22).

**Los dobles se quedan en el borde.** Se sustituyen el SDK de Anthropic, la
sesión, `fetch` y el disco. Nunca la lógica propia: si una prueba necesitara un
doble de algo de `lib/`, sería señal de que ese módulo hace demasiado.

## 5.6 Lo que estas pruebas encontraron

No se escribieron para adornar la entrega. Estos defectos los destapó la suite
mientras se construía:

1. **El resumen de preferencias se filtraba entre analistas** (H-03 en
   [04-seguridad](04-seguridad.md)). El más grave: una caché de módulo indexada
   por el número de entradas de memoria.
2. **El guion de demostración respondía la fase equivocada.** Lo encontró el
   recorrido en navegador, no las unitarias: el mensaje que la interfaz envía al
   elegir un tema ("Desarrolla el tema 1: …") se reconocía en otro archivo, y
   ninguna prueba usaba la frase real. De ahí salió `lib/agent-messages.ts`, que
   pone el contrato en un solo sitio.
3. **Dos posts guardados en el mismo milisegundo compartían identificador**
   (`Date.now()` como id), así que marcar uno como publicado arrastraba al otro.
4. **El orden de las conversaciones no cambiaba al escribir** en una creada en el
   mismo milisegundo que otra.
5. **El mensaje de configuración inválida no decía qué variable faltaba**: solo
   *"String must contain at least 32 character(s)"*.
6. **Las etiquetas del formulario de acceso no estaban asociadas a sus campos**,
   así que no se podían seleccionar por su nombre. Era un problema de
   accesibilidad real, no solo de la prueba: un lector de pantalla tampoco las
   asociaba.
7. **Recargar a mitad de una respuesta registraba un error falso.** El servidor
   seguía escribiendo en un canal ya cerrado y anotaba `Invalid state:
   Controller is already closed` como si fuera un fallo del agente, cuando era
   alguien que se fue de la página.
8. **Las pruebas escribían la caché del feed en `./data` del proyecto.** Se
   descubrió de la forma más tonta: una captura del README acabó mostrando la
   noticia de ejemplo de una prueba. Ahora la suite usa un directorio temporal.

## 5.7 Cómo correrlas

```bash
npm test             # unitarias y de integración
npm run test:cov     # con cobertura y umbrales
npm run test:e2e     # recorrido en navegador (construye y levanta la app)
npm run verify       # lint + tipos + pruebas con cobertura
```
