/**
 * Hash corto y estable para texto.
 *
 * No es criptográfico ni pretende serlo: se usa para derivar una semilla de
 * orden a partir de un mensaje y para identificar un bloque de contenido entre
 * renderizados. Estaba escrito dos veces, igual, en dos módulos distintos.
 *
 * Para contraseñas y secretos, lo que corresponde está en `lib/security.ts`.
 */

/** Variante de djb2/Java `hashCode`: determinista y siempre positiva. */
export function hashString(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

/** El mismo hash, en base 36, para usarlo como clave. */
export function hashContent(content: string): string {
  return hashString(content).toString(36);
}
