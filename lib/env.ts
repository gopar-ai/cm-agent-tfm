import { randomBytes } from 'crypto';
import { z } from 'zod';
import { hashPassword, isPasswordHash } from './security';

/**
 * Configuración del servidor, validada al arrancar.
 *
 * Antes la app leía `process.env.JWT_SECRET!` y confiaba en el `!`: si la
 * variable faltaba, el proceso arrancaba igual y reventaba más tarde, en medio
 * de una petición. Aquí se valida todo de golpe y se falla temprano con un
 * mensaje que dice exactamente qué falta (RNF-09).
 *
 * Fuera de producción se rellenan valores de desarrollo para que `npm run dev`
 * funcione en un clon recién hecho, sin configuración. En producción no se
 * rellena nada: ahí todo secreto es obligatorio.
 */

const MIN_SECRET_LENGTH = 32;

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean'
      ? value
      : ['1', 'true', 'yes', 'si'].includes(value.trim().toLowerCase())
  );

const positiveInt = (fallback: number) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return fallback;
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
    });

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    /** Sin clave, el agente responde con un guion de demostración en vez de llamar al modelo. */
    ANTHROPIC_API_KEY: z.string().trim().min(1).optional(),

    APP_USERNAME: z.string().trim().min(1).optional(),
    APP_PASSWORD: z.string().min(8).optional(),
    APP_PASSWORD_HASH: z.string().trim().optional(),

    JWT_SECRET: z.string().min(MIN_SECRET_LENGTH).optional(),
    CRON_SECRET: z.string().min(16).optional(),

    /** Fuerza el guion de demostración aunque haya clave de API. */
    DEMO_MODE: booleanish.optional(),

    /**
     * Aviso con las credenciales de prueba que se muestra bajo el formulario de
     * acceso. Solo tiene sentido en una demo pública; vacío en una instalación
     * real. Se lee en ejecución, no al construir.
     */
    DEMO_HINT: z.string().trim().max(200).optional(),

    /** Tope de llamadas reales al modelo por día, para acotar el costo (RNF-06). */
    DAILY_MODEL_CALL_BUDGET: positiveInt(120),
    /** Intentos de login permitidos por IP dentro de la ventana. */
    LOGIN_MAX_ATTEMPTS: positiveInt(8),
    /** Ventana del límite de login, en segundos. */
    LOGIN_WINDOW_SECONDS: positiveInt(300),
    /** Peticiones de chat permitidas por sesión dentro de un minuto. */
    CHAT_MAX_PER_MINUTE: positiveInt(10),
  })
  .transform((raw) => {
    const isProduction = raw.NODE_ENV === 'production';

    const username = raw.APP_USERNAME ?? (isProduction ? undefined : 'demo');
    const passwordHash =
      raw.APP_PASSWORD_HASH ??
      (raw.APP_PASSWORD
        ? hashPassword(raw.APP_PASSWORD)
        : isProduction
          ? undefined
          : hashPassword('demo1234'));
    const jwtSecret = raw.JWT_SECRET ?? (isProduction ? undefined : randomBytes(32).toString('hex'));

    return {
      nodeEnv: raw.NODE_ENV,
      isProduction,
      anthropicApiKey: raw.ANTHROPIC_API_KEY,
      username,
      passwordHash,
      jwtSecret,
      cronSecret: raw.CRON_SECRET,
      /** Si no hay clave de API o el modo demo está activo, se usa el guion de demostración. */
      useDemoAgent: raw.DEMO_MODE === true || !raw.ANTHROPIC_API_KEY,
      demoMode: raw.DEMO_MODE === true,
      demoHint: raw.DEMO_HINT || undefined,
      dailyModelCallBudget: raw.DAILY_MODEL_CALL_BUDGET,
      loginMaxAttempts: raw.LOGIN_MAX_ATTEMPTS,
      loginWindowSeconds: raw.LOGIN_WINDOW_SECONDS,
      chatMaxPerMinute: raw.CHAT_MAX_PER_MINUTE,
      /** Contraseña en claro en producción: se acepta, pero se avisa por consola. */
      plaintextPasswordInProduction:
        isProduction && !raw.APP_PASSWORD_HASH && Boolean(raw.APP_PASSWORD),
    };
  })
  .superRefine((env, ctx) => {
    if (!env.isProduction) return;

    const missing: string[] = [];
    if (!env.username) missing.push('APP_USERNAME');
    if (!env.passwordHash) missing.push('APP_PASSWORD_HASH (o APP_PASSWORD)');
    if (!env.jwtSecret) missing.push('JWT_SECRET (minimo ' + MIN_SECRET_LENGTH + ' caracteres)');

    for (const name of missing) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Falta ' + name, path: [name] });
    }

    if (env.passwordHash && !isPasswordHash(env.passwordHash)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'APP_PASSWORD_HASH no tiene el formato scrypt$<salt>$<hash>. Generalo con: npm run hash-password',
        path: ['APP_PASSWORD_HASH'],
      });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

/** Valida un conjunto de variables. Pura: no toca `process.env` ni memoriza nada. */
export function parseServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    // El nombre del campo va delante: un "String must contain at least 32
    // character(s)" suelto no le dice a nadie qué variable arreglar.
    const detail = result.error.issues
      .map((issue) => {
        const field = issue.path.join('.');
        return field ? `  - ${field}: ${issue.message}` : `  - ${issue.message}`;
      })
      .join('\n');
    throw new Error('Configuracion invalida:\n' + detail + '\n\nRevisa .env.example y el README.');
  }
  return result.data;
}

let cached: ServerEnv | null = null;

/** Configuración activa del proceso, validada una sola vez. */
export function getServerEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv();
  return cached;
}

/** Solo para pruebas: olvida la configuración memorizada. */
export function resetServerEnvCache(): void {
  cached = null;
}
