import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  isPasswordHash,
  isSafePublicHttpUrl,
  safeEqual,
  verifyPassword,
} from '@/lib/security';

describe('safeEqual', () => {
  it('reconoce dos cadenas iguales', () => {
    expect(safeEqual('contraseña-larga', 'contraseña-larga')).toBe(true);
  });

  it('distingue cadenas distintas', () => {
    expect(safeEqual('demo', 'demo1')).toBe(false);
  });

  it('no lanza cuando las longitudes difieren', () => {
    // timingSafeEqual exige buffers del mismo tamaño: por eso se comparan digests.
    expect(() => safeEqual('a', 'una cadena muchísimo más larga')).not.toThrow();
    expect(safeEqual('a', 'una cadena muchísimo más larga')).toBe(false);
  });

  it('trata la cadena vacía como un valor más', () => {
    expect(safeEqual('', '')).toBe(true);
    expect(safeEqual('', 'x')).toBe(false);
  });
});

describe('hashPassword y verifyPassword (RNF-05)', () => {
  it('genera un hash con el formato esperado', () => {
    const hash = hashPassword('contraseña-de-prueba');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(isPasswordHash(hash)).toBe(true);
  });

  it('usa una sal distinta en cada hash de la misma contraseña', () => {
    expect(hashPassword('misma')).not.toBe(hashPassword('misma'));
  });

  it('acepta la contraseña correcta', () => {
    const hash = hashPassword('abriendo-la-puerta');
    expect(verifyPassword('abriendo-la-puerta', hash)).toBe(true);
  });

  it('rechaza una contraseña equivocada', () => {
    const hash = hashPassword('abriendo-la-puerta');
    expect(verifyPassword('abriendo-la-Puerta', hash)).toBe(false);
  });

  it('rechaza un hash mal formado en vez de lanzar', () => {
    // Una configuración rota no debe convertirse en un acceso concedido.
    for (const roto of ['', 'texto-plano', 'scrypt$solo-una-parte', 'bcrypt$aa$bb', 'scrypt$ZZ$bb']) {
      expect(isPasswordHash(roto)).toBe(false);
      expect(verifyPassword('lo-que-sea', roto)).toBe(false);
    }
  });
});

describe('isSafePublicHttpUrl (OWASP A10, SSRF)', () => {
  it('acepta URLs públicas con http y https', () => {
    expect(isSafePublicHttpUrl('https://thelogisticsworld.com/nota')).toBe(true);
    expect(isSafePublicHttpUrl('http://ejemplo.com.mx/a/b?c=1')).toBe(true);
  });

  it('rechaza esquemas que no son web', () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://servidor/archivo',
      'gopher://host',
      'data:text/html,<script>',
      'javascript:alert(1)',
    ]) {
      expect(isSafePublicHttpUrl(url)).toBe(false);
    }
  });

  it('rechaza la propia máquina y la red interna', () => {
    for (const url of [
      'http://localhost:3000/admin',
      'http://app.localhost/',
      'http://127.0.0.1/',
      'http://0.0.0.0/',
      'http://10.0.0.5/secreto',
      'http://192.168.1.1/router',
      'http://172.16.9.9/',
      'http://172.31.255.1/',
      'http://100.100.0.1/',
      'http://servicio.internal/',
    ]) {
      expect(isSafePublicHttpUrl(url), url).toBe(false);
    }
  });

  it('rechaza el servicio de metadatos de la nube', () => {
    // 169.254.169.254 es la puerta a las credenciales de la instancia.
    expect(isSafePublicHttpUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('rechaza direcciones IPv6 locales', () => {
    expect(isSafePublicHttpUrl('http://[::1]:8080/')).toBe(false);
    expect(isSafePublicHttpUrl('http://[fd00::1]/')).toBe(false);
    expect(isSafePublicHttpUrl('http://[fe80::1]/')).toBe(false);
  });

  it('rechaza credenciales incrustadas en la URL', () => {
    expect(isSafePublicHttpUrl('https://usuario:clave@ejemplo.com/')).toBe(false);
  });

  it('rechaza texto que no es una URL', () => {
    expect(isSafePublicHttpUrl('')).toBe(false);
    expect(isSafePublicHttpUrl('no es una url')).toBe(false);
    expect(isSafePublicHttpUrl('https://')).toBe(false);
  });

  it('no se deja engañar por mayúsculas en el host', () => {
    expect(isSafePublicHttpUrl('http://LOCALHOST/')).toBe(false);
  });

  it('permite un rango 172 que sí es público', () => {
    // 172.15 y 172.32 quedan fuera del bloque privado 172.16-172.31.
    expect(isSafePublicHttpUrl('http://172.15.0.1/')).toBe(true);
    expect(isSafePublicHttpUrl('http://172.32.0.1/')).toBe(true);
  });
});
