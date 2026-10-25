import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, signToken, THIRTY_DAYS_SECONDS, validateCredentials } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { clientIpFrom, createRateLimiter } from '@/lib/rate-limit';
import { loginRequestSchema, validateBody } from '@/lib/schemas';

/**
 * Inicio de sesión.
 *
 * El login no tenía ningún límite: se podían probar contraseñas tan rápido como
 * aguantara el servidor. Ahora cada IP tiene un número de intentos por ventana
 * (RNF-05) y el acierto limpia su contador.
 */

const env = getServerEnv();

const loginLimiter = createRateLimiter({
  maxAttempts: env.loginMaxAttempts,
  windowSeconds: env.loginWindowSeconds,
});

export async function POST(req: NextRequest) {
  const ip = clientIpFrom(req.headers);
  const limit = loginLimiter.check(ip);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera un momento antes de volver a probar.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Petición inválida' }, { status: 400 });
  }

  const parsed = validateBody(loginRequestSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { username, password } = parsed.data;

  if (!validateCredentials(username, password)) {
    // Mismo mensaje para usuario inexistente y contraseña equivocada: no se
    // confirma qué usuarios existen (OWASP A07).
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
  }

  loginLimiter.reset(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, signToken(username), {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: THIRTY_DAYS_SECONDS,
    path: '/',
  });

  return response;
}
