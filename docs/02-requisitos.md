# 2 · Requisitos técnicos

Requisitos no funcionales con número, umbral y forma de comprobarlos. Un
requisito que no se puede medir no está en esta lista.

## 2.1 Rendimiento

| # | Requisito | Umbral | Cómo se comprueba |
|---|---|---|---|
| RNF-01 | El agente empieza a responder pronto, porque la respuesta se entrega en streaming | Primer fragmento visible en menos de 5 s en condiciones normales | Observable en la demo; el streaming está probado en `tests/api/chat.route.test.ts` |
| RNF-02 | El feed de noticias no se busca de nuevo en cada visita | Una búsqueda real al día como máximo | Dos niveles de caché (memoria y disco), probados en `tests/api/news.route.test.ts` |
| RNF-03 | Las pantallas funcionan en celular y en escritorio | El recorrido completo pasa en las dos | Playwright corre los dos perfiles: `escritorio` y `celular` |

## 2.2 Costo y límites

| # | Requisito | Umbral | Cómo se comprueba |
|---|---|---|---|
| RNF-04 | La petición al modelo tiene techo | 40 mensajes, 8.000 caracteres cada uno, 200 entradas de memoria | `tests/schemas.test.ts` |
| RNF-05 | El acceso resiste fuerza bruta | 8 intentos por IP cada 5 minutos (configurable) | `tests/api/login.route.test.ts`, `tests/rate-limit.test.ts` |
| RNF-06 | El gasto diario en el modelo tiene tope, y agotarlo no deja la app inservible | 120 llamadas al día (configurable); 10 peticiones por minuto y sesión; al agotarse, responde el guion de demostración | `tests/model-budget.test.ts`, `tests/api/chat.route.test.ts` |
| RNF-07 | El historial que viaja al modelo está acotado | Los últimos 10 mensajes | `tests/api/chat.route.test.ts` |

## 2.3 Calidad

| # | Requisito | Umbral | Cómo se comprueba |
|---|---|---|---|
| RNF-08 | Cobertura de pruebas medida, con mínimos que hacen fallar la suite | 90 % funciones · 85 % líneas · 80 % ramas · 85 % sentencias | `npm run test:cov`; los umbrales están en `vitest.config.mts` |
| RNF-09 | La configuración se valida al arrancar, no en medio de una petición | En producción, arrancar sin un secreto falla y el mensaje nombra la variable | `tests/env.test.ts` |
| RNF-10 | Ninguna marca está escrita en el código | Cambiar de marca y de fuentes es cambiar variables de entorno | `tests/brand.test.ts`, `tests/news.test.ts` |
| RNF-11 | Análisis estático sin errores | `npm run lint` termina con 0 errores | Se ejecuta en la integración continua |
| RNF-12 | Tipos comprobados en app y en pruebas | `npm run typecheck` sin errores | Se ejecuta en la integración continua |

## 2.4 Seguridad

Los detalles, los hallazgos de la auditoría y el riesgo residual están en
[04-seguridad](04-seguridad.md).

| # | Requisito | Umbral | Cómo se comprueba |
|---|---|---|---|
| RNF-13 | Las contraseñas no se guardan ni se comparan en claro | Hash scrypt con sal; comparación de tiempo constante | `tests/security.test.ts` |
| RNF-14 | Ningún secreto en el repositorio | `.env*` ignorado salvo el ejemplo, sin valores | Revisión del repositorio antes de publicar |
| RNF-15 | La sesión no es accesible desde JavaScript del navegador | Cookie `httpOnly`, `secure` en producción, `sameSite=lax` | `tests/api/login.route.test.ts` |
| RNF-16 | Las respuestas llevan cabeceras de seguridad | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, HSTS en producción | `e2e/recorrido.spec.ts` |
| RNF-17 | El texto que no es del sistema no manda sobre el prompt | Se recorta, se delimita y se marca como datos | `tests/prompt-safety.test.ts` |
| RNF-18 | El servidor no pide URLs que no sean públicas | Se rechazan esquemas no web, red privada y metadatos de nube | `tests/security.test.ts`, `tests/news.test.ts` |
| RNF-19 | La ruta sin sesión queda cerrada si falta su secreto | Sin `CRON_SECRET` responde 503, no 200 | `tests/api/news.route.test.ts` |

## 2.5 Operación

| # | Requisito | Umbral | Cómo se comprueba |
|---|---|---|---|
| RNF-20 | La aplicación se empaqueta en un contenedor reproducible | `docker build` y `docker run` levantan la app con solo variables de entorno | `Dockerfile`; receta en [08-despliegue](08-despliegue.md) |
| RNF-21 | Hay forma de saber si el servicio está en pie | `GET /api/health` responde `{ ok: true }` | `tests/auth.test.ts`; lo usa Railway como healthcheck |
| RNF-22 | Un fallo de una fuente externa no tumba la aplicación | Feed caído, disco de solo lectura o modelo caído degradan la función, no el servicio | `tests/news-fetch.test.ts`, `tests/api/*.test.ts` |
| RNF-23 | La integración continua corre en cada cambio | Lint, tipos, pruebas con cobertura, construcción y recorrido en navegador | `.github/workflows/ci.yml` |

## 2.6 Lo que se decidió no exigir

| Decisión | Por qué |
|---|---|
| Sin alta disponibilidad ni varias instancias | Un usuario por marca. Los límites en memoria y la caché del proceso dan por hecho que hay un proceso, y es suficiente ([03-diseno](03-diseno.md)) |
| Sin base de datos | El estado es de cada analista y cabe en su navegador. Añadirla traería migraciones, respaldos y datos personales que hoy no existen |
| Sin autenticación federada ni varios roles | Una sola persona por marca; un segundo rol no tendría nada distinto que hacer |
| Sin internacionalización | El contenido es en español para un mercado hispanohablante |
