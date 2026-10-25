import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Primitivas de seguridad compartidas. Viven aparte de `lib/auth.ts` para poder
 * probarlas sin arrastrar el contexto de peticiones de Next.
 */

const SCRYPT_KEYLEN = 64;
const HASH_PREFIX = 'scrypt';

/**
 * Compara dos cadenas en tiempo constante.
 *
 * Un `===` sobre un secreto se corta en el primer carácter distinto, y ese
 * tiempo de respuesta filtra cuántos caracteres iban bien. Se comparan los
 * digests SHA-256 para que ambos lados midan siempre lo mismo, incluso cuando
 * las longitudes difieren (`timingSafeEqual` exige longitudes iguales).
 */
export function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a, 'utf8').digest();
  const digestB = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(digestA, digestB);
}

/** Genera un hash `scrypt$<salt hex>$<derivada hex>` para guardar en configuración. */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `${HASH_PREFIX}$${salt}$${derived}`;
}

/** ¿Tiene la forma de un hash generado por `hashPassword`? */
export function isPasswordHash(value: string): boolean {
  const parts = value.split('$');
  return (
    parts.length === 3 &&
    parts[0] === HASH_PREFIX &&
    /^[0-9a-f]{8,}$/.test(parts[1]) &&
    /^[0-9a-f]+$/.test(parts[2])
  );
}

/**
 * Verifica una contraseña contra un hash `scrypt$...`.
 * Devuelve false ante un hash mal formado en vez de lanzar: una configuración
 * rota no debe convertirse en un acceso concedido.
 */
export function verifyPassword(password: string, stored: string): boolean {
  if (!isPasswordHash(stored)) return false;
  const [, salt] = stored.split('$');
  return safeEqual(hashPassword(password, salt), stored);
}

/** Rangos de IP que nunca deben alcanzarse desde el servidor (metadatos de nube, red interna). */
const BLOCKED_IPV4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

/**
 * ¿Es una URL pública segura de pedir desde el servidor?
 *
 * Las URLs de las noticias las propone el modelo o un feed de terceros, así que
 * son entrada no confiable: sin este filtro, pedirles la imagen de portada
 * convierte al servidor en un proxy hacia su propia red interna (SSRF,
 * OWASP A10). Solo se permite http/https hacia un host que no sea local ni
 * privado. La resolución DNS no se valida aquí; el riesgo residual queda
 * anotado en docs/04-seguridad.md.
 */
export function isSafePublicHttpUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) return false;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;
  if (BLOCKED_IPV4.some((range) => range.test(host))) return false;

  return true;
}
