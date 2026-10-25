import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { hashPassword } from '@/lib/security';

/**
 * Pruebas de la ruta de login.
 *
 * El módulo se importa dentro de cada prueba, después de fijar las variables de
 * entorno: la ruta construye su limitador al cargarse, y así cada caso estrena
 * uno limpio con los límites que quiere probar.
 */

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const USUARIO = 'analista';
const CONTRASENA = 'contraseña-de-prueba';

async function cargarRuta(extra: Record<string, string> = {}) {
  vi.resetModules();

  process.env.APP_USERNAME = USUARIO;
  process.env.APP_PASSWORD_HASH = hashPassword(CONTRASENA);
  process.env.JWT_SECRET = 'x'.repeat(40);
  for (const [clave, valor] of Object.entries(extra)) process.env[clave] = valor;

  const { resetServerEnvCache } = await import('@/lib/env');
  resetServerEnvCache();

  return (await import('@/app/api/auth/login/route')).POST;
}

function peticion(body: unknown, ip = '203.0.113.1') {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  delete process.env.LOGIN_MAX_ATTEMPTS;
});

afterEach(() => {
  delete process.env.APP_USERNAME;
  delete process.env.APP_PASSWORD_HASH;
  delete process.env.JWT_SECRET;
  delete process.env.LOGIN_MAX_ATTEMPTS;
});

describe('POST /api/auth/login (HU-15)', () => {
  it('deja entrar con las credenciales correctas', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion({ username: USUARIO, password: CONTRASENA }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('entrega la sesión en una cookie que el navegador no puede leer', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion({ username: USUARIO, password: CONTRASENA }));

    const cookie = res.cookies.get('cm-agent-token');
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
  });

  it('rechaza la contraseña equivocada', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion({ username: USUARIO, password: 'otra-cosa' }));

    expect(res.status).toBe(401);
    expect(res.cookies.get('cm-agent-token')).toBeUndefined();
  });

  it('no revela si el usuario existe: el mismo mensaje en los dos casos', async () => {
    const POST = await cargarRuta();

    const usuarioMalo = await POST(peticion({ username: 'nadie', password: CONTRASENA }));
    const contrasenaMala = await POST(peticion({ username: USUARIO, password: 'otra' }));

    expect(usuarioMalo.status).toBe(401);
    expect(contrasenaMala.status).toBe(401);
    await expect(usuarioMalo.json()).resolves.toEqual(await contrasenaMala.json());
  });

  it('rechaza un cuerpo que no es JSON', async () => {
    const POST = await cargarRuta();
    const res = await POST(peticion('esto no es json'));

    expect(res.status).toBe(400);
  });

  it('rechaza un cuerpo sin los campos necesarios', async () => {
    const POST = await cargarRuta();

    expect((await POST(peticion({}))).status).toBe(400);
    expect((await POST(peticion({ username: 'solo-usuario' }))).status).toBe(400);
  });

  it('corta los intentos repetidos de la misma IP (RNF-05)', async () => {
    const POST = await cargarRuta({ LOGIN_MAX_ATTEMPTS: '3' });

    for (let i = 0; i < 3; i++) {
      const res = await POST(peticion({ username: USUARIO, password: 'mala' }));
      expect(res.status).toBe(401);
    }

    const bloqueado = await POST(peticion({ username: USUARIO, password: 'mala' }));
    expect(bloqueado.status).toBe(429);
    expect(Number(bloqueado.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('el bloqueo es por IP: otra IP no queda castigada', async () => {
    const POST = await cargarRuta({ LOGIN_MAX_ATTEMPTS: '2' });

    await POST(peticion({ username: USUARIO, password: 'mala' }, '203.0.113.9'));
    await POST(peticion({ username: USUARIO, password: 'mala' }, '203.0.113.9'));
    expect((await POST(peticion({ username: USUARIO, password: 'mala' }, '203.0.113.9'))).status).toBe(429);

    const otraIp = await POST(peticion({ username: USUARIO, password: CONTRASENA }, '198.51.100.4'));
    expect(otraIp.status).toBe(200);
  });

  it('un acierto limpia el contador de esa IP', async () => {
    const POST = await cargarRuta({ LOGIN_MAX_ATTEMPTS: '3' });

    await POST(peticion({ username: USUARIO, password: 'mala' }));
    await POST(peticion({ username: USUARIO, password: 'mala' }));
    expect((await POST(peticion({ username: USUARIO, password: CONTRASENA }))).status).toBe(200);

    // Tras el acierto vuelve a tener los intentos completos.
    for (let i = 0; i < 3; i++) {
      expect((await POST(peticion({ username: USUARIO, password: 'mala' }))).status).toBe(401);
    }
  });

  it('también limita a quien llega sin cabecera de IP', async () => {
    const POST = await cargarRuta({ LOGIN_MAX_ATTEMPTS: '1' });

    const sinCabecera = () =>
      new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: USUARIO, password: 'mala' }),
      });

    expect((await POST(sinCabecera())).status).toBe(401);
    expect((await POST(sinCabecera())).status).toBe(429);
  });
});
