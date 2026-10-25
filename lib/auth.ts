import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getServerEnv } from './env';
import { safeEqual, verifyPassword } from './security';

/**
 * Sesión del analista.
 *
 * Cambios respecto a la primera versión, documentados en docs/04-seguridad.md:
 *  - La contraseña se compara contra un hash scrypt, no contra texto plano.
 *  - La comparación es de tiempo constante, para no filtrar aciertos parciales.
 *  - El secreto de firma se valida al arrancar, en vez de confiar en un `!`.
 */

const COOKIE_NAME = 'cm-agent-token';
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export type Session = { username: string };

export function signToken(username: string): string {
  const { jwtSecret } = getServerEnv();
  // getServerEnv garantiza el secreto en producción; fuera de ella genera uno efímero.
  return jwt.sign({ username }, jwtSecret as string, { expiresIn: THIRTY_DAYS_SECONDS });
}

export function verifyToken(token: string): Session | null {
  try {
    const { jwtSecret } = getServerEnv();
    const payload = jwt.verify(token, jwtSecret as string);
    if (typeof payload === 'object' && payload !== null && typeof payload.username === 'string') {
      return { username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Compara las credenciales recibidas con las configuradas. */
export function validateCredentials(username: string, password: string): boolean {
  const env = getServerEnv();
  if (!env.username || !env.passwordHash) return false;

  // Se evalúan las dos sin cortocircuito, para que el tiempo de respuesta no
  // revele si el usuario existe.
  const userOk = safeEqual(username, env.username);
  const passwordOk = verifyPassword(password, env.passwordHash);
  return userOk && passwordOk;
}

export { COOKIE_NAME, THIRTY_DAYS_SECONDS };
