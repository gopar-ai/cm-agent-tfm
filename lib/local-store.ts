/**
 * Acceso al almacenamiento del navegador.
 *
 * Los módulos de datos repetían el mismo bloque: comprobar que existe `window`,
 * leer la clave, `JSON.parse` dentro de un `try`, y devolver un valor por
 * defecto si algo venía corrupto. Estaba copiado seis veces, con pequeñas
 * diferencias — en dos de ellas faltaba el `try`, así que un valor corrupto
 * rompía la pantalla entera. Aquí está una sola vez (deuda técnica, docs/03).
 *
 * Todo el estado del analista vive en su propio navegador: no hay base de datos
 * ni servidor que guarde su trabajo, y por eso dos personas en la misma demo no
 * ven ni mezclan nada de la otra (decisión de diseño, docs/03-diseno.md).
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Lee y convierte un valor. Devuelve `fallback` si no existe, o si está corrupto. */
export function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/** Lee texto sin convertir. */
export function readText(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Guarda un valor. Devuelve false si el navegador lo rechaza —cuota llena o
 * modo privado— para que quien llama pueda avisar en vez de perder el dato en
 * silencio.
 */
export function writeJson(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function writeText(key: string, value: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Si no se puede borrar, no hay nada mejor que hacer aquí.
  }
}

/** Avisa a las pestañas y componentes abiertos de que algo cambió. */
export function emitChange(eventName: string): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(eventName));
}

/**
 * Se suscribe a un cambio. Devuelve la función para darse de baja.
 * Con `alsoListenStorage` también reacciona a cambios hechos en otra pestaña.
 */
export function subscribeToChange(
  eventName: string,
  callback: () => void,
  { alsoListenStorage = false }: { alsoListenStorage?: boolean } = {}
): () => void {
  if (!isBrowser()) return () => {};

  window.addEventListener(eventName, callback);
  if (alsoListenStorage) window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener(eventName, callback);
    if (alsoListenStorage) window.removeEventListener('storage', callback);
  };
}

/**
 * Identificador único para una entidad nueva.
 *
 * Antes se usaba `Date.now().toString()`: dos posts guardados en el mismo
 * milisegundo —algo que pasa al pasar un lote al calendario— compartían id, y
 * marcar uno como publicado arrastraba al otro.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
