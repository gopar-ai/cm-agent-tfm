<h1 align="center">CM Agent</h1>

<p align="center">
  <strong>Agente de community manager con IA para LinkedIn.</strong><br>
  Propone temas desde la actualidad del sector, genera dos versiones de cada post, las lleva a un calendario<br>
  y aprende en silencio el estilo editorial de la marca a partir de lo que eliges.
</p>

<p align="center">
  <a href="https://cm-agent-tfm-production.up.railway.app"><img alt="Probar la demo" src="https://img.shields.io/badge/probar%20la%20demo-0a66c2?style=for-the-badge"></a>
</p>

<p align="center">
  <img alt="Pruebas" src="https://img.shields.io/badge/pruebas-406%20✓-2da44e">
  <a href="https://github.com/gopar-ai/cm-agent-tfm/actions"><img alt="CI" src="https://github.com/gopar-ai/cm-agent-tfm/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="Node" src="https://img.shields.io/badge/node-24-333">
  <img alt="Licencia" src="https://img.shields.io/badge/licencia-MIT-333">
</p>

![Recorrido completo: entrar, elegir un tema, ver el ángulo y comparar las dos versiones](docs/screenshots/demo.gif)

---

## Probar la demo

> **<https://cm-agent-tfm-production.up.railway.app>** · usuario `demo` · contraseña `demo1234`
>
> Las credenciales aparecen también en la propia pantalla de acceso.

1. **Entra.** El agente ya está proponiendo cinco temas; no hay que pedírselo.
2. **Pulsa "Elegir este tema".** Antes de escribir una línea te da el ángulo, el por qué ahora y la emoción objetivo.
3. **Elige un formato.** Llegan dos versiones con ganchos distintos y tres titulares cada una.
4. **Abre el calendario.** Ahí se ve el mes con borradores, programados y publicados.

A la derecha, el **feed del sector con noticias reales**: de ahí salen los temas de actualidad.

La versión publicada corre en **modo de demostración**: el agente responde con un guion local en vez de llamar al modelo, así que se recorre entero sin gastar nada. El código es el mismo y la aplicación lo declara en la cabecera `X-Agent-Source`.

---

## Para quién es

Una empresa **B2B de tecnología** —una startup de software, una plataforma, una consultora técnica— que necesita publicar en LinkedIn de forma constante, y donde eso recae en **una sola persona**, no en un equipo de contenido.

Siempre los mismos cuatro problemas:

| El problema | Lo que hace CM Agent |
|---|---|
| Decidir **de qué** publicar cuesta más que escribirlo | Propone cinco temas nada más abrir, mezclando fondo del sector y actualidad |
| Sin seguir la actualidad, el contenido queda intemporal | Lee los medios del sector y solo llama "actualidad" a lo publicado hoy o ayer |
| Cada herramienta de IA genérica pide que le expliques todo otra vez | Conoce la marca: a quién le habla, qué le duele y qué no se dice nunca |
| Lo que funcionó el mes pasado no queda registrado | Aprende de cada elección y propone más cerca de ese estilo |

La marca es **configuración, no código**: cambiar de empresa —o de sector— es cambiar variables de entorno. La demo usa una empresa ficticia de software B2B llamada Vertia.

---

## Cómo funciona

```
Analista (chat)
     │
     ▼
Claude (Anthropic, con Web Search nativo)
     │
     ├─► Fase 1: propuesta de temas (evergreen + actualidad con fecha verificada)
     ├─► Fase 2: ángulo sugerido (gancho, por qué ahora, emoción objetivo)
     ├─► Fase 3: 2 versiones A/B por formato (Copy, Copy + imagen, Carrusel, PDF, Video)
     └─► Fase 4: confirmación + ajustes iterativos
     │
     ▼
Panel editable (titulares, copy, hashtags) ──► Calendario / Borradores (localStorage)
```

---

## Lo que hace, en detalle

- **Flujo en cuatro fases** — el agente no pregunta qué quieres: entrega lo que toca en cada paso.
- **Cinco formatos con estructura propia** — copy, copy + imagen (con el prompt para generarla), carrusel, documento y guion de vídeo.
- **Actualidad verificada** — solo entra como "actualidad" lo publicado hoy o ayer, comparando la fecha de forma literal. Si no hay nada fresco, completa con temas de fondo en vez de colar una noticia vieja.
- **Memoria silenciosa** — aprende formato, versión y estilo de titular preferidos, y los aplica sin mencionarlo. A partir de tres elecciones: con menos, el patrón sería ruido.
- **Feed del sector** — RSS de medios reales más búsqueda web, con caché en memoria y en disco para no repetir la búsqueda del día.
- **Calendario de contenido** — borradores, programados y publicados.
- **Varias propuestas a la vez** — nombrables, fijables, ordenadas por última actividad.
- **Contexto de marca editable** — ICP, tono, temas prioritarios y prohibidos, desde la propia aplicación.
- **Modo de demostración** — el flujo completo funciona sin clave de API.
- **Costo acotado** — presupuesto diario de llamadas, límite por minuto y techo por petición. Al agotarse el presupuesto el agente **sigue atendiendo** con el guion local, en vez de quedarse muerto.

---

## Cómo se ve

<table>
<tr>
<td width="50%"><img alt="El agente propone cinco temas al abrir, con el feed del sector al lado" src="docs/screenshots/2-temas.png"></td>
<td width="50%"><img alt="Ángulo, por qué ahora y emoción objetivo, con el selector de formato" src="docs/screenshots/3-angulo.png"></td>
</tr>
<tr>
<td><strong>1 · Propone sin que se lo pidas.</strong> Cinco temas: unos de fondo, otros de actualidad con medio, fecha y enlace.</td>
<td><strong>2 · El ángulo, antes de escribir.</strong> Corregir el rumbo aquí es barato; después de leer un post entero, no.</td>
</tr>
<tr>
<td><img alt="Comparación de la versión A y la versión B con sus titulares" src="docs/screenshots/4-versiones.png"></td>
<td><img alt="Calendario con borradores, programados y publicados" src="docs/screenshots/5-calendario.png"></td>
</tr>
<tr>
<td><strong>3 · Dos versiones para comparar.</strong> Ganchos distintos y tres titulares cada una. Elegir es la interfaz.</td>
<td><strong>4 · El mes, de un vistazo.</strong> Borrador, programado y publicado, con el contenido ya escrito.</td>
</tr>
</table>

---

## Pruebas y seguridad

La aplicación se construyó a lo largo de varios meses y ya se usaba a diario. Lo que no tenía era red de seguridad: ni una sola prueba, ni revisión automática, ni auditoría. Hoy tiene **406 pruebas**, **ocho hallazgos de seguridad corregidos** y una integración continua que falla si algo baja.

| | |
|---|---|
| **Pruebas** | 406 unitarias y de integración (5 s) · 11 recorridos en navegador real × 2 perfiles |
| **Cobertura** | 98 % sentencias · 97 % funciones · 99 % líneas · 90 % ramas, con umbrales que hacen fallar la suite |
| **Seguridad** | Auditoría propia con **ocho hallazgos corregidos**; OWASP Top 10, API Security y GenAI LLM recorridos uno a uno |
| **Integración continua** | Lint · tipos · pruebas con cobertura · construcción · navegador · imagen Docker levantada y comprobada |
| **Defectos encontrados** | Once, cada uno con su prueba de regresión y su explicación en el código |

Dos que merecen mención, porque funcionaban y nadie los habría visto:

- **Una caché de preferencias indexada por el número de elecciones.** Dos personas con tres elecciones cada una recibían las preferencias de la otra dentro de su prompt. En una demo pública, eso es una fuga de datos entre sesiones.
- **Un SSRF al pedir la portada de las noticias.** El servidor pedía URLs propuestas por el modelo sin mirarlas; bastaba una que apuntara al servicio de metadatos de la nube.

El detalle está en [docs/04-seguridad.md](docs/04-seguridad.md) y [docs/05-pruebas.md](docs/05-pruebas.md).

---

## Stack

| | |
|---|---|
| **Lenguaje** | TypeScript, modo estricto |
| **Framework** | Next.js 16 · App Router · React 19 |
| **Estilos** | Tailwind CSS 4 |
| **IA** | Claude Sonnet 4.6 (agente) y Claude Haiku 4.5 (feed), con búsqueda web nativa |
| **Validación** | Zod, en la configuración y en la entrada de la API |
| **Sesión** | JWT en cookie `httpOnly`; contraseña en hash scrypt |
| **Pruebas** | Vitest · Playwright |
| **Entorno** | Node.js 24 · Docker multietapa · GitHub Actions · Railway |
| **Persistencia** | `localStorage` del navegador — decisión de diseño, no carencia ([docs/03](docs/03-diseno.md)) |

---

## Instalación

Requisitos: **Node.js 24 o superior**.

```bash
git clone https://github.com/gopar-ai/cm-agent-tfm.git
cd cm-agent-tfm
npm install
npm run dev
```

Abrir <http://localhost:3000> y entrar con **`demo` / `demo1234`**.

No hace falta configurar nada ni tener clave de API: fuera de producción la aplicación rellena credenciales de desarrollo y el agente responde con su guion de demostración. Se recorre el flujo completo tal cual.

<details>
<summary><strong>Con el agente real</strong></summary>

```bash
cp .env.example .env.local
# editar .env.local y poner ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

</details>

<details>
<summary><strong>Con Docker</strong></summary>

```bash
docker build -t cm-agent .
docker run -p 3000:3000 \
  -e APP_USERNAME=demo \
  -e APP_PASSWORD=demo1234 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e DEMO_MODE=true \
  cm-agent
```

La receta completa, con todas las variables, en [docs/08-despliegue.md](docs/08-despliegue.md).

</details>

<details>
<summary><strong>Comandos</strong></summary>

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` · `npm start` | Construcción y arranque de producción |
| `npm test` | 406 pruebas unitarias y de integración (~5 s) |
| `npm run test:cov` | Las mismas, con cobertura y umbrales |
| `npm run test:e2e` | Recorrido en navegador real, escritorio y celular |
| `npm run verify` | Lint + tipos + pruebas con cobertura |
| `npm run slides` | Regenera la presentación (HTML y PDF) |
| `npm run portadas` | Regenera las portadas del feed de ejemplo |
| `npm run hash-password -- "tu contraseña"` | Genera el valor de `APP_PASSWORD_HASH` |

</details>

<details>
<summary><strong>Estructura del proyecto</strong></summary>

```
cm-agent-tfm/
├── app/                        Next.js App Router
│   ├── api/
│   │   ├── auth/login/         acceso: límite por IP, hash, cookie firmada
│   │   ├── chat/               conversación: validación, presupuesto, modelo o guion
│   │   ├── cron/refresh-news/  refresco programado del feed
│   │   ├── health/             estado del servicio
│   │   └── news/               feed con caché en memoria y disco
│   ├── calendar/               calendario de contenido
│   ├── dashboard/              chat y configuración del contexto
│   └── login/
│
├── components/                 tarjetas de temas, ángulo, versiones A/B, feed…
│
├── lib/
│   ├── agent-messages.ts       contrato de mensajes entre interfaz y agente
│   ├── anthropic.ts            prompt del sistema y streaming del modelo
│   ├── agent-context.ts        contexto de marca editable
│   ├── agent-memory.ts         memoria de preferencias editoriales
│   ├── brand.ts                identidad de la marca, por configuración
│   ├── calendar-storage.ts     calendario, borradores y publicados
│   ├── chat-storage.ts         conversaciones guardadas
│   ├── demo-agent.ts           guion de demostración, sin API
│   ├── demo-seed.ts            contenido de ejemplo del calendario
│   ├── env.ts                  configuración validada al arrancar
│   ├── model-budget.ts         presupuesto diario de llamadas al modelo
│   ├── news*.ts                feed: fuentes, RSS, búsqueda, caché, relevancia
│   ├── post-parser.ts          lectura de los bloques que devuelve el modelo
│   ├── prompt-safety.ts        texto no confiable que entra al prompt
│   ├── rate-limit.ts           límite de peticiones por clave
│   ├── schemas.ts              techos de la entrada de la API
│   └── security.ts             hash, comparación segura, validación de URL
│
├── tests/                      406 pruebas unitarias y de integración
├── e2e/                        recorrido en navegador real
├── docs/                       documentación técnica y presentación
├── scripts/                    capturas, portadas, slides, hash de contraseña
├── Dockerfile                  imagen multietapa, usuario sin privilegios
├── proxy.ts                    middleware de sesión
└── .github/workflows/ci.yml    integración continua
```

</details>

---

## Documentación técnica

| | |
|---|---|
| [01 · Especificación](docs/01-especificacion.md) | Problema, actores, 15 historias con criterios de aceptación y prioridad |
| [02 · Requisitos](docs/02-requisitos.md) | 23 requisitos no funcionales con umbral medible |
| [03 · Diseño](docs/03-diseno.md) | Arquitectura, siete decisiones con su alternativa y su costo, riesgos, deuda reconocida |
| [04 · Seguridad](docs/04-seguridad.md) | Auditoría propia, OWASP Top 10 + API + LLM, riesgo residual |
| [05 · Pruebas](docs/05-pruebas.md) | Estrategia, trazabilidad historia–prueba, y los defectos que encontraron |
| [08 · Despliegue](docs/08-despliegue.md) | Variables, Docker, Railway, qué vigilar |

---

## Entrega del proyecto final

| | |
|---|---|
| **Aplicación publicada** | <https://cm-agent-tfm-production.up.railway.app> |
| **Usuario / contraseña de prueba** | `demo` / `demo1234` |
| **Repositorio** | <https://github.com/gopar-ai/cm-agent-tfm> |
| **Presentación** | [`docs/slides.pdf`](docs/slides.pdf) · 16 diapositivas |
| **Vídeo** | _(pendiente de publicar)_ |

<details>
<summary><strong>Dónde está cada cosa que pide la entrega</strong></summary>

| Requisito | Dónde |
|---|---|
| a · Descripción general del proyecto | [Para quién es](#para-quién-es) y [Cómo funciona](#cómo-funciona) |
| b · Stack tecnológico | [Stack](#stack) |
| c · Instalación y ejecución | [Instalación](#instalación) y el desplegable de comandos |
| d · Estructura del proyecto | El desplegable de estructura |
| e · Funcionalidades principales | [Lo que hace, en detalle](#lo-que-hace-en-detalle) y [Cómo se ve](#cómo-se-ve) |
| f · Usuario y contraseña de prueba | La tabla de aquí arriba, y la propia pantalla de acceso |
| Código fuente | Repositorio público, enlazado arriba |
| Despliegue en funcionamiento | URL de aquí arriba · receta en [docs/08](docs/08-despliegue.md) |
| Slides | [`docs/slides.pdf`](docs/slides.pdf), dentro del repositorio |

</details>

> Las imágenes de este README se graban contra la demo, con una marca ficticia, y se regeneran con `node scripts/capturas.mjs` y `node scripts/demo-gif.mjs`: así no envejecen y nunca muestran datos de un cliente real.

---

## Licencia

MIT. Ver [LICENSE](LICENSE).
