import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  emitChange,
  isBrowser,
  newId,
  readJson,
  readText,
  removeKey,
  subscribeToChange,
  writeJson,
  writeText,
} from '@/lib/local-store';
import { installBrowser } from './helpers/browser';

describe('local-store con navegador', () => {
  let browser: ReturnType<typeof installBrowser>;

  beforeEach(() => {
    browser = installBrowser();
  });

  afterEach(() => {
    browser.uninstall();
  });

  it('reconoce que hay navegador', () => {
    expect(isBrowser()).toBe(true);
  });

  it('guarda y lee un objeto', () => {
    writeJson('clave', { a: 1, b: ['x'] });
    expect(readJson('clave', null)).toEqual({ a: 1, b: ['x'] });
  });

  it('devuelve el valor por defecto si la clave no existe', () => {
    expect(readJson('no-existe', 'defecto')).toBe('defecto');
    expect(readJson('no-existe', [])).toEqual([]);
  });

  it('devuelve el valor por defecto si el contenido está corrupto', () => {
    browser.storage.seedRaw('clave', '{roto');
    expect(readJson('clave', 'defecto')).toBe('defecto');
  });

  it('devuelve el valor por defecto si lo guardado es null', () => {
    browser.storage.seedRaw('clave', 'null');
    expect(readJson('clave', 'defecto')).toBe('defecto');
  });

  it('guarda y lee texto sin convertir', () => {
    writeText('texto', 'hola');
    expect(readText('texto')).toBe('hola');
    expect(readText('otro')).toBeNull();
  });

  it('borra una clave', () => {
    writeText('texto', 'hola');
    removeKey('texto');
    expect(readText('texto')).toBeNull();
  });

  it('avisa cuando el navegador rechaza la escritura', () => {
    browser.storage.failWrites(true);

    expect(writeJson('clave', { a: 1 })).toBe(false);
    expect(writeText('texto', 'hola')).toBe(false);
  });

  it('borrar una clave inexistente no lanza', () => {
    expect(() => removeKey('no-existe')).not.toThrow();
  });

  it('notifica a quien esté suscrito', () => {
    let avisos = 0;
    const desuscribir = subscribeToChange('mi-evento', () => {
      avisos++;
    });

    emitChange('mi-evento');
    emitChange('mi-evento');
    expect(avisos).toBe(2);

    desuscribir();
    emitChange('mi-evento');
    expect(avisos).toBe(2);
  });

  it('puede escuchar también los cambios de otra pestaña', () => {
    let avisos = 0;
    const desuscribir = subscribeToChange('mi-evento', () => avisos++, { alsoListenStorage: true });

    emitChange('storage');
    expect(avisos).toBe(1);

    desuscribir();
  });
});

describe('local-store sin navegador (renderizado en el servidor)', () => {
  it('no lanza y devuelve valores por defecto', () => {
    expect(isBrowser()).toBe(false);
    expect(readJson('clave', 'defecto')).toBe('defecto');
    expect(readText('clave')).toBeNull();
    expect(writeJson('clave', 1)).toBe(false);
    expect(writeText('clave', 'x')).toBe(false);
    expect(() => removeKey('clave')).not.toThrow();
    expect(() => emitChange('evento')).not.toThrow();
  });

  it('suscribirse devuelve una baja que no hace nada', () => {
    const desuscribir = subscribeToChange('evento', () => {});
    expect(() => desuscribir()).not.toThrow();
  });
});

describe('newId', () => {
  it('no repite identificadores, ni creados en el mismo instante', () => {
    // El error que arregla: `Date.now()` daba el mismo id a dos posts guardados
    // en el mismo milisegundo.
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
  });

  it('devuelve una cadena no vacía', () => {
    expect(newId().length).toBeGreaterThan(8);
  });
});
