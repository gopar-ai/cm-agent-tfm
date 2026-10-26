# 3 · Documento de diseño

Cómo está construido CM Agent, qué se decidió, qué se descartó y qué deuda
queda reconocida.

## 3.1 Contexto

El punto de partida de esta entrega era una aplicación que **ya funcionaba** en
producción: el flujo de cuatro fases, el feed, el calendario y la memoria
estaban hechos y en uso. Lo que no había era nada de lo que sostiene a una
aplicación en el tiempo: **ni una sola prueba, ni integración continua, ni
contenedor, ni validación de configuración, ni cabeceras de seguridad**, y la
marca del cliente estaba escrita dentro del código.

Así que el trabajo no fue construir funciones nuevas, sino **llevar una
aplicación que funciona al punto en que se puede sostener, auditar y entregar a
otra persona**. Ese cambio de foco es el que explica cada decisión de aquí
abajo.

## 3.2 Objetivos y no objetivos

**Objetivos**

1. Que cualquiera pueda clonar, arrancar y probar el flujo completo sin una
   clave de API y sin configurar nada.
2. Que el código no contenga datos de ningún cliente: la marca entra por
   configuración.
3. Red de seguridad real: pruebas con cobertura medida y umbrales que fallan.
4. Cerrar los agujeros de seguridad encontrados en la auditoría propia.
5. Acotar el costo del modelo, que es el riesgo operativo de una app con IA
   abierta a internet.

**No objetivos**

1. Rediseñar la interfaz. Funciona y está en uso; tocarla era riesgo sin premio.
2. Escalar a varias instancias. Un proceso, un usuario por marca.
3. Añadir funciones nuevas al agente. El alcance era calidad, no producto.

## 3.3 Arquitectura

```
┌──────────────────────── Navegador del analista ────────────────────────┐
│  Pantallas (React, Next App Router)                                    │
│    login · chat · configuración · calendario · feed                    │
│                                                                        │
│  Estado del analista (localStorage)                                    │
│    conversaciones · calendario · memoria · contexto · noticias         │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ fetch con cookie de sesión
┌────────────────────────────────▼───────────────────────────────────────┐
│ Proxy (middleware): sin sesión válida → /login                         │
├────────────────────────────────────────────────────────────────────────┤
│ Rutas de API                                                           │
│   /api/auth/login   límite por IP + hash scrypt + cookie firmada       │
│   /api/chat         valida entrada · presupuesto · modelo o guion      │
│   /api/news         caché memoria → caché disco → búsqueda             │
│   /api/cron/…       secreto comparado en tiempo constante              │
│   /api/health       estado del servicio                                │
├────────────────────────────────────────────────────────────────────────┤
│ Núcleo (lib/)                                                          │
│                                                                        │
│   Reglas puras            Infraestructura         Configuración        │
│   ───────────────         ─────────────────       ──────────────       │
│   post-parser             anthropic (SDK)         env (validación)     │
│   agent-memory            news (modelo + RSS)     brand                │
│   demo-agent              news-cache (disco)      news-sources         │
│   prompt-safety           local-store             schemas              │
│   security · rate-limit · model-budget · day-key                       │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   Claude Sonnet 4.6       Claude Haiku 4.5         Feeds RSS
   (agente + web search)   (búsqueda del feed)      del sector
```

**Dos capas, una regla:** lo que se puede probar sin red ni navegador vive en
funciones puras (`post-parser`, `agent-memory`, `prompt-safety`, `demo-agent`,
`security`, `rate-limit`, `model-budget`); lo que habla con el mundo queda
aislado en módulos propios. Esa separación es la razón de que la cobertura sea
alta sin pruebas frágiles: el 98 % del núcleo se prueba sin levantar nada.

## 3.4 Recorrido de una propuesta

```
Analista: "empecemos"
   │
   ├─ POST /api/chat ── valida (schemas) ── ¿sesión? ── ¿cupo? ── ¿presupuesto?
   │                                                                   │
   │                                        ┌──────────────────────────┤
   │                                        ▼                          ▼
   │                             modelo real (Sonnet)        guion de demostración
   │                             + web search                (sin API, sin costo)
   │                                        └──────────────┬───────────┘
   │                                                       │ streaming de texto
   ▼                                                       ▼
Interfaz: post-parser reconoce el bloque y dibuja tarjetas (temas / ángulo /
          versiones A-B / post), en vez de un muro de texto
   │
   ├─ el analista elige ──► se registra la elección (memoria silenciosa)
   │
   └─ al conversar de nuevo ──► resumen de preferencias dentro del prompt
```

El **parser es el contrato** entre el modelo y la interfaz: el prompt pide
bloques con delimitadores (`---VERSIONES---`, `---ANGULO---`, `---POST---`) y la
interfaz los reconoce para dibujar controles. De ahí dos consecuencias de
diseño: es la pieza con más pruebas del proyecto, y ningún texto que venga de
fuera puede colar esos delimitadores ([04-seguridad](04-seguridad.md)).

## 3.5 Decisiones

### D-01 · El estado del analista vive en su navegador, no en una base de datos

**Alternativas:** Postgres gestionado · almacenamiento de archivos · navegador.

**Elegida:** el navegador (`localStorage`), con una capa única de acceso
(`lib/local-store.ts`).

**Por qué:** cada analista solo necesita sus propias conversaciones, y nunca hay
dos personas sobre el mismo dato. Una base de datos añadiría migraciones,
respaldos y datos personales que hoy no existen, sin resolver ningún problema
real. En la versión publicada tiene un beneficio extra que resultó decisivo:
**dos visitantes distintos no pueden verse nada**, porque no hay nada compartido
que ver.

**Lo que cuesta:** el trabajo no viaja entre dispositivos, y borrar los datos del
navegador lo borra. Es aceptable para una herramienta de redacción diaria; si
dejara de serlo, la capa única de acceso es justo el punto por donde se
cambiaría.

### D-02 · Dos modelos, uno por tarea

Sonnet 4.6 conversa; Haiku 4.5 busca noticias. Extraer titulares y fechas no
necesita el modelo grande, y la diferencia de costo es de un orden de magnitud.

### D-03 · Modo de demostración dentro del producto, no un mock de pruebas

**El problema:** el agente necesita una clave de API de pago. Sin ella, quien
clona el repositorio ve una pantalla de acceso y nada más; y la demo publicada
quedaría a merced de que alguien agote la clave probando.

**La solución:** `lib/demo-agent.ts` reproduce el flujo de cuatro fases con el
mismo formato de salida que el modelo. Se activa solo cuando no hay clave,
cuando se pide (`DEMO_MODE`) o cuando se agota el presupuesto del día; la
respuesta declara su origen en la cabecera `X-Agent-Source`.

**Por qué está en `lib/` y no en los tests:** sirve a tres cosas a la vez —que se
pueda evaluar sin costo, que la demo publicada aguante, y que el recorrido en
navegador sea determinista y gratis. Un doble de pruebas solo serviría a la
tercera.

**Lo que cuesta:** es código de producción que hay que mantener al día con el
formato del prompt. Lo sostienen las pruebas de `demo-agent`, que pasan su
salida por los mismos parsers que la del modelo real: si el formato se separa,
la suite falla.

### D-04 · Límites en memoria, no en Redis

El límite por IP y el presupuesto diario viven en memoria del proceso.

**Por qué:** con un proceso, Redis no añade corrección y sí una dependencia que
hay que levantar, vigilar y pagar. El reloj se inyecta (`now`) para poder probar
ventanas y cambios de día sin esperar.

**Lo que cuesta:** reiniciar el proceso olvida los contadores, y con dos
instancias los límites se multiplicarían por el número de instancias. Si algún
día hace falta escalar, el cambio está acotado a dos módulos con interfaz
propia (`rate-limit`, `model-budget`).

### D-05 · Dos topes de uso, uno de cortesía y uno de verdad

El contador del navegador (`lib/usage.ts`, 3 propuestas al día) es un
recordatorio para el analista y cualquiera puede borrarlo. El tope real está en
el servidor (`lib/model-budget.ts`), que es quien paga. Se conservan los dos a
propósito: cumplen funciones distintas, y confundirlos era el error de la
primera versión, donde el único límite era el del navegador.

### D-06 · Todo lo que cuenta "por día" corta a la medianoche de México

`lib/day-key.ts`, usado por el presupuesto, la caché y el contador. El servidor
corre en UTC: con `new Date().getDate()`, el día cambiaba a las 18:00 hora local.

### D-07 · El parser con expresiones regulares, y el RSS también

Son formatos fijos y conocidos, de los que se extraen cuatro o cinco campos.
Sumar un parser de XML o pedirle JSON estricto al modelo añadía dependencia o
fragilidad sin ganar nada medible. El límite está asumido: feeds muy exóticos o
un modelo que se salga del formato pedido devuelven menos resultados, nunca una
excepción.

## 3.6 Riesgos

| Riesgo | Qué pasa si ocurre | Qué lo contiene |
|---|---|---|
| El modelo se sale del formato pedido | La interfaz no dibuja tarjetas y muestra texto plano | Los parsers devuelven `null` en vez de lanzar: se degrada, no se rompe |
| Se agota la clave de API o falla el proveedor | El agente no responde | Presupuesto diario + caída al guion de demostración, declarada en pantalla |
| Alguien abusa de la demo publicada | Factura inesperada | Límite por IP en el acceso, por minuto y sesión en el chat, y tope diario global |
| Un medio del sector cambia o cae | El feed pierde una fuente | Cada feed se pide por separado y los fallos se ignoran; la caché del día sigue sirviendo |
| Inyección de instrucciones por el contexto o las noticias | El agente cambia de comportamiento o falsifica bloques | Texto acotado, delimitado y marcado como datos ([04](04-seguridad.md)) |
| El contenedor tiene disco de solo lectura | No se puede guardar la caché | `setCachedNews` avisa y devuelve `false`; se sigue con la caché en memoria |

## 3.7 Deuda técnica reconocida

| # | Deuda | Por qué sigue ahí | Plan |
|---|---|---|---|
| DT-01 | Cinco componentes leen `localStorage` en un efecto al montarse (`react-hooks/set-state-in-effect`, 8 avisos) | `localStorage` no existe en el servidor: leerlo al inicializar el estado rompería la hidratación. El patrón es deliberado, pero no es el que React recomienda hoy | Migrar a `useSyncExternalStore` con `getServerSnapshot`, empezando por `Sidebar`. La capa `local-store` ya concentra el acceso, que es el trabajo previo |
| DT-02 | Las pantallas (`.tsx`) no tienen pruebas de componente | El recorrido en navegador cubre los caminos críticos de la interfaz, y la lógica está fuera de los componentes | Añadir Testing Library para los componentes con lógica propia (`VersionEditPanel`, `TopicsList`) |
| DT-03 | `app/calendar/page.tsx` lee `localStorage` directo en vez de usar `lib/calendar-storage` | Quedó así de la versión anterior; cambiarlo tocaba la pantalla con más estado | Pasar esa pantalla por la capa de datos, que ya tiene las funciones y las pruebas |
| DT-04 | La CSP permite `script-src 'unsafe-inline'` | Next inyecta el estado de hidratación en un script en línea | Nonce por petición desde el middleware ([04-seguridad](04-seguridad.md)) |
| DT-05 | La validación anti-SSRF trabaja sobre el nombre del host, no sobre la IP resuelta | Resolver DNS en cada petición añade latencia y una condición de carrera propia | Resolver y validar la IP antes de pedir, o salir por un proxy con lista blanca |

## 3.8 Métricas del resultado

| Métrica | Antes | Ahora |
|---|---|---|
| Pruebas automáticas | 0 | 383 unitarias y de integración + 10 en navegador real (×2 perfiles) |
| Cobertura del núcleo | — | 98 % sentencias · 97 % funciones · 99 % líneas · 90 % ramas |
| Integración continua | No | Lint, tipos, pruebas con cobertura, construcción y recorrido en navegador |
| Contenedor | No | Dockerfile multietapa, usuario sin privilegios |
| Validación de configuración | `process.env.JWT_SECRET!` | Esquema validado al arrancar, con mensaje por campo |
| Hallazgos de seguridad abiertos | 7 | 0 (riesgo residual documentado) |
| Marca en el código | Escrita en 4 archivos | Ninguno: entra por configuración |
