# 6 · Cotejo con lo que pide el máster

Qué pide el programa, dónde está en este proyecto y cómo comprobarlo.

**Estado:** ✅ hecho · 🟦 pendiente de una acción manual

## A · Entregables del proyecto final

| # | Qué piden | Dónde está | Estado |
|---|---|---|---|
| A1 | Aplicación real, original y con valor propio | Herramienta en uso real para publicar en LinkedIn; no es un ejercicio | ✅ |
| A2 | Que demuestre lo aprendido | Secciones B a G de este documento | ✅ |
| A3 | README completo: descripción, stack, instalación, estructura, funcionalidades, usuario de prueba | [README](../README.md) | ✅ |
| A4 | Repositorio público en GitHub | <https://github.com/gopar-ai/cm-agent-tfm> — copia limpia, sin historial previo y sin datos de cliente | ✅ |
| A5 | Despliegue funcionando, con URL | <https://cm-agent-tfm-production.up.railway.app> — Railway, en modo de demostración. Receta en [08](08-despliegue.md) | ✅ |
| A6 | Slides de presentación | [`slides.md`](slides.md) | ✅ |
| A7 | Vídeo con captura de pantalla | Guion en [`guion-video.md`](guion-video.md) | 🟦 grabación |
| A8 | Usuario y contraseña de prueba | `demo` / `demo1234`, también visibles en la propia pantalla de acceso | ✅ |

## B · Requisitos y especificación

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| B1 | Historias de usuario "Como / quiero / para" | [01](01-especificacion.md#15-historias-de-usuario) — 15 historias | ✅ |
| B2 | Criterios de aceptación "Dado / cuando / entonces" | Cada historia con los suyos | ✅ |
| B3 | Prioridad de cada requisito | Tres niveles, marcados historia por historia | ✅ |
| B4 | Actores, incluido el propio sistema | [01](01-especificacion.md#13-actores) — cinco actores, con la tarea programada como actor | ✅ |
| B5 | Detectar ambigüedades | [01](01-especificacion.md#16-ambigüedades-detectadas-y-cómo-se-resolvieron) — seis, con su resolución | ✅ |
| B6 | Requisitos no funcionales con número | [02](02-requisitos.md) — 23, con umbral y forma de comprobarlos | ✅ |
| B7 | Requisitos rastreables hasta el código y las pruebas | [05](05-pruebas.md#53-trazabilidad) — tabla historia → pruebas | ✅ |
| B8 | Documento de diseño con alternativas, riesgos y métricas | [03](03-diseno.md) | ✅ |
| B9 | Trabajar con la especificación por delante | La especificación se escribió antes de tocar el código de esta entrega | ✅ |
| B10 | Diagramas | Arquitectura y recorrido de una propuesta en [03](03-diseno.md#33-arquitectura) | ✅ |
| B11 | Decir qué queda fuera | [01](01-especificacion.md#14-alcance) — no objetivos, con su motivo | ✅ |

## C · Arquitectura

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| C1 | Separar el núcleo del negocio de la tecnología | Reglas puras en `lib/` (parsers, memoria, seguridad, límites) separadas de lo que habla con el mundo (SDK, red, disco) | ✅ |
| C2 | Piezas intercambiables | La marca, las fuentes del sector y el origen de la respuesta (modelo o guion) se cambian por configuración | ✅ |
| C3 | Nombres y carpetas ordenados | [README](../README.md#estructura) | ✅ |
| C4 | No repetir código | Se unificaron el acceso al almacenamiento, el hash corto, la clave del día y el contrato de mensajes, que estaban duplicados | ✅ |
| C5 | Reglas escritas para los agentes de IA | `AGENTS.md` y `CLAUDE.md` en la raíz | ✅ |
| C6 | Degradación elegante | Feed caído, disco de solo lectura, modelo caído o presupuesto agotado degradan la función, nunca el servicio (RNF-22) | ✅ |

## D · Calidad y pruebas

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| D1 | Muchas pruebas pequeñas, algunas de conjunto, pocas de punta a punta | 343 unitarias · 40 de integración · 20 en navegador (10 × 2 perfiles) | ✅ |
| D2 | Pruebas de punta a punta de lo crítico | Tres recorridos en Chrome y en perfil de celular | ✅ |
| D3 | Cobertura mínima medida | 98 % sentencias · 97 % funciones · 99 % líneas · 90 % ramas, con umbrales que hacen fallar la suite | ✅ |
| D4 | Probar con datos de ejemplo, reiniciables | El modo de demostración sirve también a las pruebas; el doble de navegador se estrena en cada prueba | ✅ |
| D5 | Que la pantalla no se rompa al cambiar algo | El recorrido corre en los dos perfiles; las cabeceras de seguridad se comprueban contra el servidor real | ✅ |
| D6 | Análisis estático y tipos | `npm run lint` sin errores; tipos comprobados en aplicación y pruebas | ✅ |

## E · Infraestructura

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| E1 | Revisión automática en cada cambio | [`ci.yml`](../.github/workflows/ci.yml) — cuatro trabajos | ✅ |
| E2 | Empaquetar en un contenedor | [`Dockerfile`](../Dockerfile) multietapa, usuario sin privilegios, con healthcheck. La integración continua lo levanta y comprueba que responde | ✅ |
| E3 | Despliegue | Railway, con `railway.json` y healthcheck en `/api/health` | ✅ |
| E4 | Orquestación a gran escala (Kubernetes) | No aplica: un proceso, una analista por marca. El motivo está en [03](03-diseno.md#d-04--límites-en-memoria-no-en-redis) | ✅ decisión justificada |

## F · Seguridad

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| F1 | Claves fuera del código | `.env*` ignorado salvo la plantilla sin valores; configuración validada al arrancar | ✅ |
| F2 | Control de acceso | Middleware de sesión, cada ruta revalida, cookie `httpOnly` | ✅ |
| F3 | No confiar en lo que llega de fuera | Entrada validada con esquemas; el texto que entra al prompt se acota y se marca como datos | ✅ |
| F4 | Límites para evitar abusos | Intentos de acceso por IP, peticiones por minuto, presupuesto diario | ✅ |
| F5 | Configuración segura | Cabeceras de seguridad, contenedor sin privilegios, `X-Powered-By` apagado | ✅ |
| F6 | Registro sin datos sensibles | Los fallos se registran con contexto, sin credenciales ni contenido | ✅ en parte (ver R-05) |
| F7 | Riesgos propios de la IA | OWASP LLM recorrido en [04](04-seguridad.md#43-riesgos-propios-de-usar-un-modelo-de-lenguaje): inyección, salida, consumo, agencia | ✅ |
| F8 | Recorrido de OWASP Top 10 | [04](04-seguridad.md#42-recorrido-de-owasp-top-10-2021), con los diez puntos y ocho hallazgos corregidos | ✅ |

## G · Trabajo con IA

| # | Qué enseña el máster | Dónde | Estado |
|---|---|---|---|
| G1 | No depender de un solo proveedor | El agente queda detrás de un módulo propio y la aplicación funciona sin él (modo de demostración). Cambiar de proveedor es cambiar `lib/anthropic.ts` | ✅ en parte |
| G2 | Elegir el modelo según la tarea y cuidar el costo | Sonnet para conversar, Haiku para el feed; ocho medidas de control de costo en [07](07-trabajo-con-ia.md#cómo-se-controla-el-costo) | ✅ |
| G3 | Conectar al agente con herramientas reales | Búsqueda web nativa, acotada por turno | ✅ |
| G4 | Tareas programadas | Refresco del feed por cron, con su secreto | ✅ |
| G5 | Planear antes de construir | La especificación y el diseño van por delante; cada decisión queda escrita con su alternativa | ✅ |
| G6 | Usar la IA para construir, con criterio | [07](07-trabajo-con-ia.md#72-la-ia-para-construir-el-producto): qué hizo, qué no, y los dos errores que cometió y cómo se detectaron | ✅ |

## Resumen

**Lo que queda pendiente** es una sola acción manual: grabar el vídeo con el
guion ya escrito (A7). El repositorio está publicado y la demo, desplegada y
probada de punta a punta contra su URL real.

**Lo que distingue a esta entrega:** no es un proyecto nuevo hecho para aprobar,
sino una aplicación en uso llevada al punto en que se puede sostener. De ahí
salen las dos cosas que más dicen del trabajo: una **auditoría propia con ocho
hallazgos de seguridad corregidos** —incluida una fuga de datos entre sesiones
que nadie había visto— y **once defectos de comportamiento** que destaparon las pruebas y el primer
despliegue, cada uno con su prueba de regresión y su explicación en el código.
