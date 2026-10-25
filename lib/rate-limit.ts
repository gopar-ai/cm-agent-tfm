/**
 * Límite de peticiones por clave, con ventana deslizante en memoria.
 *
 * En memoria a propósito: la app corre como un solo proceso y el objetivo es
 * frenar fuerza bruta y ráfagas de gasto (RNF-05, RNF-06), no sostener un
 * límite distribuido. La alternativa con Redis, y por qué se descartó, está en
 * docs/03-diseno.md.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Intentos restantes en la ventana actual. */
  remaining: number;
  /** Segundos hasta que se libere un intento. 0 si todavía hay cupo. */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
  /** Borra los intentos de una clave; se usa al autenticar correctamente. */
  reset: (key: string) => void;
  /** Vacía todo el estado. */
  clear: () => void;
};

export type RateLimiterOptions = {
  maxAttempts: number;
  windowSeconds: number;
  /** Reloj inyectable, para poder probar el paso del tiempo sin esperar. */
  now?: () => number;
};

const MAX_TRACKED_KEYS = 10000;

export function createRateLimiter({
  maxAttempts,
  windowSeconds,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  const windowMs = windowSeconds * 1000;
  const hits = new Map<string, number[]>();

  function prune(currentTime: number): void {
    for (const [key, timestamps] of hits) {
      const fresh = timestamps.filter((t) => currentTime - t < windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();

      // Cota de memoria: quien rote la clave no debe hacer crecer el mapa sin fin.
      if (hits.size > MAX_TRACKED_KEYS) prune(currentTime);

      const recent = (hits.get(key) ?? []).filter((t) => currentTime - t < windowMs);

      if (recent.length >= maxAttempts) {
        const oldest = recent[0];
        hits.set(key, recent);
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - currentTime) / 1000)),
        };
      }

      recent.push(currentTime);
      hits.set(key, recent);
      return { allowed: true, remaining: maxAttempts - recent.length, retryAfterSeconds: 0 };
    },

    reset(key: string): void {
      hits.delete(key);
    },

    clear(): void {
      hits.clear();
    },
  };
}

/** Identifica al cliente detrás de un proxy, tomando solo el primer salto. */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'desconocida';
}
