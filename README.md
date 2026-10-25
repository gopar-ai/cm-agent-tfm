# CM Agent

Agente de community manager con IA para LinkedIn: genera, itera y programa contenido para Detecta Security mediante un flujo conversacional de varias fases, con aprendizaje silencioso de preferencias editoriales.

![Demo de CM Agent](docs/screenshots/demo.gif)

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

Cada elección del analista (versión, formato, titular) se registra como memoria silenciosa que el agente usa en conversaciones futuras para acercarse al estilo preferido del equipo, sin que el analista tenga que configurar nada manualmente.

## Features

- *Flujo en 4 fases* — temas, ángulo, versiones A/B, confirmación e iteración
- *Feed de noticias en vivo* — RSS de medios de logística en México + búsqueda web, con caché en memoria de 6h y caché en disco diaria
- *Calendario de contenido* — borradores, programados y publicados, con sección de publicados en el sidebar
- *Memoria silenciosa* — aprende formato, versión y estilo de titular preferidos con el uso
- *Configuración editable* — contexto de marca, tono y temas prioritarios desde la propia app
- *Sesión persistente* — login con JWT de 30 días

### Optimizaciones de costo

- **Modelo por función**: el agente conversacional usa Claude Sonnet 4.6; la búsqueda del feed de noticias usa Claude Haiku 4.5 (más barato, suficiente para extraer titulares/fechas)
- **System prompt compacto**: instrucciones densas sin perder reglas funcionales (~44% más corto que la versión inicial)
- **Web Search acotado**: máximo 3 búsquedas por turno en el chat (`max_uses`)
- **Caché del feed**: 6 horas en memoria + respaldo diario en disco antes de volver a buscar en vivo
- **Historial acotado**: solo los últimos 10 mensajes de cada conversación se envían al modelo
- **Memoria cacheada**: el resumen de preferencias del equipo solo se recalcula si hay entradas nuevas en `cm_memoria`

## Setup

```bash
cp .env.example .env.local   # completa tus credenciales
npm install
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `APP_USERNAME` / `APP_PASSWORD` | Credenciales de acceso del analista |
| `JWT_SECRET` | Secreto para firmar la sesión (genera un string aleatorio largo) |
| `CRON_SECRET` | Protege el endpoint de refresco diario del feed de noticias |

## Tech stack

- **Next.js (App Router)** — frontend y API routes
- **Anthropic Claude (Sonnet 4.6 + Haiku 4.5)** — agente conversacional (Sonnet) y búsqueda del feed de noticias (Haiku), ambos con Web Search nativo
- **RSS + web scraping** — feed de noticias de logística en México
- **Railway** — deploy + cron del feed de noticias
- **localStorage** — persistencia de chats, calendario, memoria y configuración (sin base de datos)
