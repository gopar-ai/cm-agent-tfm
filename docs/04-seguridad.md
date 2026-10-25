# 4 · Seguridad

Auditoría propia de la aplicación, los siete hallazgos que tenía, cómo se
corrigieron y qué riesgo queda vivo. Se recorre OWASP Top 10 (2021) y, por ser
una aplicación con un modelo de lenguaje, también OWASP Top 10 for LLM.

Todo lo que aquí se afirma tiene una prueba detrás; la columna "prueba" nombra
el archivo.

## 4.1 Hallazgos y correcciones

### H-01 · Contraseña en texto plano, comparada con `===`

**Antes**

```ts
export function validateCredentials(username: string, password: string): boolean {
  return username === process.env.APP_USERNAME && password === process.env.APP_PASSWORD;
}
```

Tres problemas en dos líneas: la contraseña vivía en claro en la configuración
(visible para cualquiera con acceso al panel de Railway); `===` sobre texto
corta en el primer carácter distinto, y ese tiempo de respuesta filtra cuántos
caracteres iban bien; y el `&&` cortocircuita, así que un usuario inexistente
respondía más rápido que una contraseña equivocada, revelando qué usuarios
existen.

**Ahora** hash scrypt con sal (`lib/security.ts`), comparación de digests en
tiempo constante con `timingSafeEqual`, y las dos comprobaciones se evalúan
siempre, sin cortocircuito. `npm run hash-password` genera el valor a
configurar. En producción, una contraseña en claro se acepta pero se marca como
aviso.

**OWASP** A02 (fallos criptográficos), A07 (identificación y autenticación).
**Prueba** `tests/security.test.ts`, `tests/auth.test.ts`.

### H-02 · Acceso sin límite de intentos

No había nada que frenara probar contraseñas en bucle: el único límite era el
ancho de banda del atacante.

**Ahora** ventana deslizante por IP (8 intentos cada 5 minutos, configurable),
respuesta 429 con `Retry-After`, y un acierto limpia el contador de esa IP. El
mensaje de error es el mismo para usuario inexistente y contraseña equivocada.

**OWASP** A07. **Prueba** `tests/api/login.route.test.ts`, `tests/rate-limit.test.ts`.

### H-03 · El resumen de preferencias se filtraba entre analistas

El hallazgo más serio, y el menos visible.

**Antes**

```ts
let cachedMemoryCount = -1;
let cachedMemorySummary: string | null = null;

function getMemorySummary(memoria?: MemoryEntry[]): string | null {
  const count = memoria?.length ?? 0;
  if (count !== cachedMemoryCount) {          // ← la clave es el NÚMERO de entradas
    cachedMemorySummary = buildMemorySummary(memoria ?? []);
    cachedMemoryCount = count;
  }
  return cachedMemorySummary;
}
```

Esas variables viven en el módulo, o sea en el proceso, compartidas por todas las
peticiones. La caché se indexaba por el **número** de entradas de memoria, no por
su contenido. Dos personas con tres elecciones cada una —con la misma cantidad y
contenido distinto— recibían el resumen de quien llegó primero: sus temas, sus
formatos, su estilo, dentro del prompt de otra.

En la demo publicada, con dos visitantes a la vez, eso es una fuga de datos entre
sesiones.

**Ahora** el resumen se calcula en cada petición, a partir de la memoria que llegó
en ella. Recorrer unas decenas de entradas cuesta microsegundos; la caché ahorraba
eso y costaba la privacidad del otro.

**OWASP** A01 (control de acceso roto), A04 (diseño inseguro).
**Prueba** `tests/api/chat.route.test.ts` → *"no mezcla las preferencias de dos
analistas con el mismo número de elecciones"*.

### H-04 · Entrada sin validar hacia el modelo

`/api/chat` hacía `await req.json()` y pasaba el resultado al modelo. Un cliente
autenticado podía enviar cien mensajes de cien mil caracteres: factura ajena,
respuesta lenta y, con suficiente insistencia, servicio degradado para todos.

**Ahora** esquemas Zod con techo (`lib/schemas.ts`): 40 mensajes, 8.000 caracteres
cada uno, 200 entradas de memoria, roles restringidos a `user`/`assistant`. Lo
que no valida se rechaza con 400 **antes** de llamar al modelo. El error nombra el
campo, sin devolver el valor recibido.

**OWASP** A03 (inyección), A04. **Prueba** `tests/schemas.test.ts`, `tests/api/chat.route.test.ts`.

### H-05 · Inyección de prompt desde el contexto y las noticias

Dos textos que no son del sistema acaban dentro del prompt: el contexto de marca
que el analista edita y el resumen de preferencias. Un tercero —titulares de
medios— entra por la búsqueda web. El prompt los pegaba tal cual, y además los
priorizaba:

> *"si contradice alguna instrucción general de arriba, prioriza este contexto"*

Eso es entregar el control. Y había una segunda vía, más concreta: la interfaz
reconoce bloques con delimitadores (`---POST---`, `---VERSIONES---`) para dibujar
tarjetas. Un contexto que contuviera `---POST---` hacía que la aplicación
**dibujara una tarjeta de post que el modelo nunca generó**.

**Ahora** (`lib/prompt-safety.ts`):

1. Se recorta a 8.000 caracteres y se quitan caracteres de control.
2. Se neutralizan los delimitadores del protocolo: se sustituye el guion por un
   guion no separable, así el texto sigue siendo legible para el modelo pero ya
   no coincide con lo que buscan los parsers.
3. Se envuelve en un bloque etiquetado que declara explícitamente que el
   contenido son **datos y no instrucciones**, y que si intenta cambiar las
   reglas, el formato o revelar el prompt, se ignora.

**OWASP LLM** LLM01 (inyección de prompt). **Prueba** `tests/prompt-safety.test.ts`,
donde las pruebas intentan falsificar bloques y comprueban que el parser ya no los
reconoce.

### H-06 · SSRF al pedir la portada de las noticias

Para mostrar la imagen de cada noticia, el servidor pedía la URL del artículo y
leía su `og:image`. Esas URLs las propone el modelo o un feed de terceros, y se
pedían sin mirar: bastaba con que una fuente devolviera
`http://169.254.169.254/latest/meta-data/` para que el servidor consultara el
servicio de metadatos de la nube —donde viven las credenciales de la
instancia— y su contenido acabara en el HTML.

**Ahora** `isSafePublicHttpUrl` valida antes de cada petición: solo `http`/`https`,
sin credenciales incrustadas, y se rechazan `localhost`, `.internal`, las redes
privadas (10/8, 172.16/12, 192.168/16, 127/8, 100.64/10), el rango de
metadatos (169.254/16) y las IPv6 locales. Se aplica a la URL de la noticia, a
la imagen que se obtiene de ella y a los enlaces de los feeds RSS. Las
redirecciones no se siguen (`redirect: 'manual'`), porque un redirect es justo la
forma de saltarse una validación hecha solo en la primera URL.

**OWASP** A10 (SSRF). **Prueba** `tests/security.test.ts` (16 casos),
`tests/news.test.ts`.

### H-07 · Configuración sin validar y ruta de cron abierta

`const JWT_SECRET = process.env.JWT_SECRET!` — el `!` le dice al compilador "yo
sé que está", pero en ejecución no lo garantiza nadie: sin la variable, la
aplicación arrancaba y firmaba tokens con `undefined`.

La ruta `/api/cron/refresh-news` queda fuera de la sesión por diseño, y se
protegía con `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``. Si la
variable no estaba configurada, el secreto esperado era la cadena
`"Bearer undefined"`: la ruta quedaba abierta a quien lo adivinara —y es
adivinable—, dejando una operación costosa (una búsqueda completa con el modelo)
al alcance de cualquiera.

**Ahora** `lib/env.ts` valida toda la configuración al arrancar, con esquema y
mensaje que nombra cada variable que falta; en producción no se rellena nada.
La ruta de cron compara en tiempo constante y, **sin secreto configurado,
responde 503 en vez de quedar abierta**.

**OWASP** A01, A05 (configuración insegura). **Prueba** `tests/env.test.ts`,
`tests/api/news.route.test.ts`.

### H-08 · Respuestas sin cabeceras de seguridad

`next.config.ts` estaba vacío: ninguna CSP, ningún `nosniff`, ningún
`X-Frame-Options`, y la cabecera `X-Powered-By` anunciando el framework.

**Ahora** CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS en
producción y `poweredByHeader: false`.

**OWASP** A05. **Prueba** `e2e/recorrido.spec.ts`, que las comprueba contra el
servidor real.

## 4.2 Recorrido de OWASP Top 10 (2021)

| | Riesgo | Cómo se trata aquí |
|---|---|---|
| **A01** | Control de acceso roto | Middleware que exige sesión en todo salvo `/login`; cada ruta de API revalida la sesión; la de cron se cierra sin su secreto (H-07); sin caché compartida entre sesiones (H-03) |
| **A02** | Fallos criptográficos | Contraseña en hash scrypt con sal; sesión en JWT firmado con secreto de 32 caracteres mínimo; cookie `httpOnly` + `secure` en producción (H-01) |
| **A03** | Inyección | No hay base de datos ni SQL. La entrada se valida con esquemas (H-04) y el texto que va al prompt se acota y delimita (H-05) |
| **A04** | Diseño inseguro | Límites de gasto y de peticiones por diseño, no como parche; el modo de demostración evita exponer una clave de pago para que la app sea probable |
| **A05** | Configuración insegura | Cabeceras de seguridad (H-08); configuración validada al arrancar (H-07); contenedor con usuario sin privilegios |
| **A06** | Componentes vulnerables | Dependencias mínimas (Next, React, SDK de Anthropic, jsonwebtoken, Zod); `npm audit` corre en la integración continua |
| **A07** | Identificación y autenticación | Límite de intentos (H-02), mensaje idéntico para usuario y contraseña, comparación de tiempo constante (H-01) |
| **A08** | Integridad de datos y software | Dependencias fijadas con `package-lock.json`; la integración continua instala con `npm ci` |
| **A09** | Registro y vigilancia | Los fallos se registran con contexto y **sin** credenciales ni contenido del analista; `/api/health` para vigilancia externa. Reconocido como lo más flojo: no hay registro estructurado ni alertas |
| **A10** | SSRF | Validación de URL antes de cada petición saliente, sin seguir redirecciones (H-06) |

## 4.3 Riesgos propios de usar un modelo de lenguaje

| | Riesgo (OWASP LLM) | Cómo se trata |
|---|---|---|
| **LLM01** | Inyección de prompt | Texto acotado, delimitado y marcado como datos; delimitadores del protocolo neutralizados (H-05) |
| **LLM02** | Tratamiento inseguro de la salida | La salida del modelo nunca se ejecuta ni se inyecta como HTML: React escapa el texto y los parsers solo extraen campos. Ninguna respuesta decide una acción con efectos |
| **LLM04** | Denegación de servicio por consumo | Presupuesto diario de llamadas, límite por minuto y sesión, historial acotado a 10 mensajes y techo por mensaje (H-04) |
| **LLM06** | Revelación de información sensible | El contexto de marca no sale del navegador del analista salvo para su propia petición; sin caché compartida (H-03); los registros no guardan contenido |
| **LLM08** | Agencia excesiva | El agente solo tiene búsqueda web. No publica, no envía, no borra: produce texto que una persona decide usar |
| **LLM09** | Confianza excesiva en la salida | El prompt prohíbe inventar estadísticas y exige fecha y fuente verificables en las noticias; las dos versiones A/B empujan a elegir en vez de aceptar |

## 4.4 Riesgo residual

Lo que sigue abierto, dicho con claridad:

| # | Riesgo que queda | Por qué se acepta hoy | Qué lo cerraría |
|---|---|---|---|
| R-01 | La CSP admite `script-src 'unsafe-inline'` | Next inyecta el estado de hidratación en un script en línea; una CSP estricta rompería la aplicación | Nonce por petición generado en el middleware y propagado a la cabecera |
| R-02 | La validación anti-SSRF mira el nombre del host, no la IP resuelta | Un dominio público que resuelva a una IP privada pasaría el filtro. Resolver DNS en cada petición añade latencia y una condición de carrera entre validar y pedir | Resolver y validar la IP antes de la petición, o salir por un proxy con lista blanca |
| R-03 | Los límites viven en memoria del proceso | Con una sola instancia son correctos; reiniciar olvida los contadores | Redis, si algún día hay más de una instancia |
| R-04 | Un único usuario compartido, sin segundo factor | Es una herramienta de una analista por marca; añadir identidades sin necesidad es más superficie, no menos | Identidad federada si entraran varias personas |
| R-05 | Sin registro estructurado ni alertas | Fuera del alcance de esta entrega; hoy se usa el registro de Railway | Registro en JSON con identificador de petición y alerta sobre tasa de error |
| R-06 | El analista autenticado puede gastar presupuesto a propósito | Es quien tiene las credenciales; el tope diario acota el daño | Presupuesto por usuario, si hubiera varios |

## 4.5 Manejo de secretos

- Ningún secreto en el repositorio. `.gitignore` excluye `.env*` salvo
  `.env.example`, que solo lleva nombres de variable y comentarios.
- Los secretos se configuran en el entorno de ejecución (Railway) o en un `.env.local`
  que nunca se publica.
- La contraseña se guarda como hash (`APP_PASSWORD_HASH`), no en claro.
- Antes de publicar el repositorio se revisó que no hubiera claves ni rastro de
  ningún cliente en el historial. Este repositorio **nace sin historial previo**
  justamente por eso: el proyecto original vivía en otro repositorio y arrastrar
  su historia era arrastrar su riesgo.
