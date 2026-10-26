# 8 · Despliegue y operación

## 8.1 Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `APP_USERNAME` | en producción | Usuario que puede entrar |
| `APP_PASSWORD_HASH` | en producción | Contraseña en hash scrypt. Se genera con `npm run hash-password` |
| `APP_PASSWORD` | alternativa | Contraseña en claro. Se acepta y se convierte en hash al arrancar, pero queda marcada como aviso: preferible el hash |
| `JWT_SECRET` | en producción | Firma de la sesión. Mínimo 32 caracteres aleatorios |
| `ANTHROPIC_API_KEY` | no | Sin ella, el agente responde con su guion de demostración |
| `DEMO_MODE` | no | `true` fuerza el guion aunque haya clave |
| `CRON_SECRET` | no | Protege el refresco programado del feed. Sin ella, esa ruta responde 503 |
| `DEMO_HINT` | no | Texto con las credenciales de prueba que se muestra en el acceso. Solo para la demo pública |
| `DAILY_MODEL_CALL_BUDGET` | no | Llamadas al modelo por día. Por defecto 120 |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_SECONDS` | no | Límite del acceso. Por defecto 8 cada 300 s |
| `CHAT_MAX_PER_MINUTE` | no | Peticiones de chat por minuto y sesión. Por defecto 10 |
| `NEWS_CACHE_DIR` | no | Carpeta de la caché del feed. Por defecto `./data` |
| `NEXT_PUBLIC_BRAND_*` | no | Identidad de la marca: `NAME`, `DESCRIPTION`, `CORE_SERVICE`, `WEBSITE`, `AUDIENCE`, `SECTOR` |
| `NEWS_RSS_FEEDS` / `NEWS_SEARCH_DOMAINS` / `NEWS_SEARCH_QUERIES` | no | Fuentes del sector, separadas por coma |

Fuera de producción no hace falta configurar nada: la aplicación rellena usuario
`demo`, contraseña `demo1234` y un secreto de firma efímero, y avisa de que lo
hace. En producción no rellena nada y **falla al arrancar** si falta un secreto,
nombrando cuál.

## 8.2 En local

```bash
npm install
npm run dev          # http://localhost:3000 · usuario demo · contraseña demo1234
```

Para usar el agente real, crear `.env.local` con `ANTHROPIC_API_KEY`.

## 8.3 Con Docker

```bash
docker build -t cm-agent .

docker run -p 3000:3000 \
  -e APP_USERNAME=analista \
  -e APP_PASSWORD_HASH='scrypt$...' \
  -e JWT_SECRET='...' \
  -e ANTHROPIC_API_KEY='sk-ant-...' \
  -v cm-agent-data:/app/data \
  cm-agent
```

La imagen es multietapa y la final solo lleva el paquete `standalone` de Next,
sus archivos estáticos y `public/`. Corre con un usuario sin privilegios
(`nextjs`, uid 1001) y trae su propio `HEALTHCHECK`.

El volumen en `/app/data` conserva la caché del feed entre reinicios. Sin él la
aplicación funciona igual: la primera visita del día busca de nuevo.

## 8.4 En Railway

El repositorio incluye `railway.json` con el healthcheck apuntando a
`/api/health` y reinicio ante fallo.

1. Crear el proyecto desde el repositorio.
2. Configurar las variables de la tabla de arriba (como mínimo `APP_USERNAME`,
   `APP_PASSWORD_HASH`, `JWT_SECRET`).
3. Para la demo pública, añadir `DEMO_HINT` con las credenciales de
   prueba, y `DAILY_MODEL_CALL_BUDGET` ajustado a lo que se quiera gastar.
4. Opcional: un cron diario que llame a `/api/cron/refresh-news` con la cabecera
   `Authorization: Bearer $CRON_SECRET`, para que la primera visita del día no
   espere la búsqueda.

> `NEXT_PUBLIC_*` se incrusta **al construir**, no al arrancar: cambiar la marca
> exige un despliegue nuevo, no basta con reiniciar. El resto de variables,
> incluido `DEMO_HINT`, se leen en ejecución.

## 8.5 Qué vigilar

| Señal | Dónde | Qué significa |
|---|---|---|
| `/api/health` | HTTP | El servicio responde |
| `X-Agent-Source: demostracion` | Cabecera de `/api/chat` | El agente no está usando el modelo. La razón va en `X-Agent-Demo-Reason`: `sin-clave`, `modo-demo` o `presupuesto-agotado` |
| `X-Model-Calls-Remaining` | Cabecera de `/api/chat` | Llamadas que quedan hoy |
| `X-Cache` | Cabecera de `/api/news` | `HIT-memoria`, `HIT-disco`, `MISS` o `ERROR` |
| `[noticias] no se pudo escribir la caché` | Registro | Disco de solo lectura o sin volumen: funciona, pero busca más veces |

## 8.6 Integración continua

`.github/workflows/ci.yml` corre en cada cambio y en cada pull request:

| Trabajo | Qué hace |
|---|---|
| **calidad** | Lint, tipos (aplicación y pruebas), pruebas con cobertura y umbrales, `npm audit` informativo. Publica el informe de cobertura |
| **construcción** | Construye en modo producción con secretos de relleno |
| **navegador** | Instala Chromium y corre el recorrido completo. Publica el informe |
| **contenedor** | Construye la imagen, levanta el contenedor y espera a que `/api/health` responda |

Ninguno necesita una clave de API: la integración continua corre con
`DEMO_MODE=true`, así que no gasta ni un token.
