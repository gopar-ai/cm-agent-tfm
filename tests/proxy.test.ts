import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { isPublicPath, proxy } from '@/proxy';

/**
 * La puerta de entrada.
 *
 * Existe por un defecto encontrado al desplegar: `/api/health` quedaba detrás de
 * la sesión y respondía 307 hacia el login. El healthcheck de Railway y el del
 * contenedor daban el servicio por sano sin haberlo comprobado nunca.
 */

vi.mock('@/lib/auth', () => ({
  verifyToken: (token: string) => (token === 'token-valido' ? { username: 'analista' } : null),
}));

function peticion(ruta: string, token?: string) {
  const req = new NextRequest(`http://localhost${ruta}`);
  if (token) req.cookies.set('cm-agent-token', token);
  return req;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('rutas públicas', () => {
  it('el acceso y su API no exigen sesión', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/api/auth/login')).toBe(true);
  });

  it('el healthcheck no exige sesión', () => {
    // Lo consulta la plataforma, que no tiene cookie.
    expect(isPublicPath('/api/health')).toBe(true);
    expect(proxy(peticion('/api/health')).status).toBe(200);
  });

  it('la tarea programada no exige sesión: se protege con su propio secreto', () => {
    expect(isPublicPath('/api/cron/refresh-news')).toBe(true);
  });

  it('no confunde una ruta que solo empieza parecido', () => {
    // `/loginfalso` no es `/login`.
    expect(isPublicPath('/loginfalso')).toBe(false);
    expect(isPublicPath('/api/healthz')).toBe(false);
  });
});

describe('rutas protegidas', () => {
  it('sin cookie manda al acceso', () => {
    const res = proxy(peticion('/dashboard'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('con una cookie inservible manda al acceso', () => {
    const res = proxy(peticion('/dashboard', 'galleta-rota'));
    expect(res.headers.get('location')).toContain('/login');
  });

  it('con sesión válida deja pasar', () => {
    expect(proxy(peticion('/dashboard', 'token-valido')).status).toBe(200);
  });

  it('protege también el calendario y las API con datos', () => {
    for (const ruta of ['/calendar', '/dashboard/config', '/api/chat', '/api/news']) {
      expect(isPublicPath(ruta), ruta).toBe(false);
      expect(proxy(peticion(ruta)).headers.get('location'), ruta).toContain('/login');
    }
  });
});
