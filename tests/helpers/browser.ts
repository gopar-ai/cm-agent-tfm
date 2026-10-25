/**
 * Doble del navegador para las pruebas.
 *
 * Implementa lo justo que usan los módulos de datos: `localStorage` y los
 * eventos de `window`. Permite además simular un almacenamiento que rechaza
 * escrituras, que es lo que pasa con la cuota llena o en modo privado.
 */

export type FakeStorage = Storage & {
  /** Hace que cualquier escritura lance, como cuando se llena la cuota. */
  failWrites: (fail: boolean) => void;
  /** Guarda un valor crudo, sin pasar por JSON: sirve para probar datos corruptos. */
  seedRaw: (key: string, value: string) => void;
};

export function createFakeStorage(): FakeStorage {
  let store = new Map<string, string>();
  let shouldFail = false;

  const storage = {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (shouldFail) throw new Error('QuotaExceededError');
      store.set(key, String(value));
    },
    failWrites(fail: boolean) {
      shouldFail = fail;
    },
    seedRaw(key: string, value: string) {
      store.set(key, value);
    },
  };

  return storage as FakeStorage;
}

/**
 * Instala el doble de navegador y devuelve el almacenamiento y una función para
 * desinstalarlo.
 */
export function installBrowser(): { storage: FakeStorage; uninstall: () => void } {
  const storage = createFakeStorage();
  const target = new EventTarget();

  const fakeWindow = {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };

  // Se asigna sobre un `Record` en vez de sobre el tipo `Window` del DOM: el
  // doble implementa a propósito solo lo que los módulos usan, no las 200
  // propiedades de un `window` de verdad.
  const globalRef = globalThis as unknown as Record<string, unknown>;
  globalRef.window = fakeWindow;
  globalRef.localStorage = storage;

  return {
    storage,
    uninstall() {
      delete globalRef.window;
      delete globalRef.localStorage;
    },
  };
}
