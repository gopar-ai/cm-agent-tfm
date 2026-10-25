# Imagen de CM Agent.
#
# Tres etapas para que la imagen final no cargue con lo que solo hace falta para
# construir: las dependencias de desarrollo y el código fuente se quedan atrás.
# Se apoya en la salida `standalone` de Next, que copia al paquete únicamente
# los módulos que el servidor usa en ejecución.

# --- 1. Dependencias --------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

# Solo los manifiestos: así esta capa se reaprovecha mientras no cambien las
# dependencias, aunque cambie el código.
COPY package.json package-lock.json ./
RUN npm ci

# --- 2. Construcción --------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# La construcción de Next evalúa la configuración del servidor, que en
# producción exige los secretos. Estos valores son de relleno, válidos solo
# durante el build: en ejecución manda el entorno real.
ENV NODE_ENV=production
ENV APP_USERNAME=build
ENV APP_PASSWORD=build-only-placeholder
ENV JWT_SECRET=valor-de-relleno-solo-para-construir-la-imagen

RUN npm run build

# --- 3. Ejecución -----------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario sin privilegios: un proceso que no necesita ser root no debe serlo
# (OWASP A05).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Carpeta de la caché de noticias: se crea con permisos del usuario del proceso
# para que no haya que escribir en la raíz de la aplicación.
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data
ENV NEWS_CACHE_DIR=/app/data

USER nextjs
EXPOSE 3000

# El propio contenedor dice si está sano; Railway y Docker lo usan igual.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
