import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowser } from './helpers/browser';
import {
  getAgentContext,
  hasStoredAgentContext,
  resetAgentContext,
  saveAgentContext,
} from '@/lib/agent-context';

/**
 * Sesión del analista y contexto guardado en su navegador.
 */

let cookieActual: { value: string } | undefined;

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => cookieActual }),
}));

async function cargarAuth(env: Record<string, string> = {}) {
  vi.resetModules();

  process.env.APP_USERNAME = 'analista';
  process.env.JWT_SECRET = 'secreto-de-prueba-largo-para-firmar-tokens';
  for (const [clave, valor] of Object.entries(env)) process.env[clave] = valor;

  const { resetServerEnvCache } = await import('@/lib/env');
  resetServerEnvCache();

  return import('@/lib/auth');
}

afterEach(() => {
  cookieActual = undefined;
  delete process.env.APP_USERNAME;
  delete process.env.APP_PASSWORD;
  delete process.env.APP_PASSWORD_HASH;
  delete process.env.JWT_SECRET;
});

describe('tokens de sesión', () => {
  it('firma un token y lo vuelve a leer', async () => {
    const { signToken, verifyToken } = await cargarAuth();

    const token = signToken('analista');
    expect(verifyToken(token)).toEqual({ username: 'analista' });
  });

  it('rechaza un token manipulado', async () => {
    const { signToken, verifyToken } = await cargarAuth();

    const token = signToken('analista');
    expect(verifyToken(token.slice(0, -2) + 'xx')).toBeNull();
    expect(verifyToken('cualquier-cosa')).toBeNull();
    expect(verifyToken('')).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const primera = await cargarAuth();
    const token = primera.signToken('analista');

    const segunda = await cargarAuth({ JWT_SECRET: 'otro-secreto-igual-de-largo-pero-distinto' });
    expect(segunda.verifyToken(token)).toBeNull();
  });

  it('lee la sesión de la cookie', async () => {
    const { getSession, signToken } = await cargarAuth();

    cookieActual = { value: signToken('analista') };
    await expect(getSession()).resolves.toEqual({ username: 'analista' });
  });

  it('sin cookie no hay sesión', async () => {
    const { getSession } = await cargarAuth();

    cookieActual = undefined;
    await expect(getSession()).resolves.toBeNull();
  });

  it('con una cookie inservible no hay sesión', async () => {
    const { getSession } = await cargarAuth();

    cookieActual = { value: 'galleta-rota' };
    await expect(getSession()).resolves.toBeNull();
  });
});

describe('validateCredentials', () => {
  it('acepta las credenciales configuradas', async () => {
    const { validateCredentials } = await cargarAuth({ APP_PASSWORD: 'contraseña-larga' });

    expect(validateCredentials('analista', 'contraseña-larga')).toBe(true);
  });

  it('rechaza usuario o contraseña equivocados', async () => {
    const { validateCredentials } = await cargarAuth({ APP_PASSWORD: 'contraseña-larga' });

    expect(validateCredentials('otro', 'contraseña-larga')).toBe(false);
    expect(validateCredentials('analista', 'otra-cosa')).toBe(false);
    expect(validateCredentials('', '')).toBe(false);
  });

  it('distingue mayúsculas en el usuario', async () => {
    const { validateCredentials } = await cargarAuth({ APP_PASSWORD: 'contraseña-larga' });

    expect(validateCredentials('Analista', 'contraseña-larga')).toBe(false);
  });
});

describe('contexto del agente guardado en el navegador (HU-07)', () => {
  let browser: ReturnType<typeof installBrowser>;

  beforeEach(() => {
    browser = installBrowser();
  });

  afterEach(() => {
    browser.uninstall();
  });

  it('sin nada guardado devuelve el contexto por defecto de la marca', () => {
    expect(hasStoredAgentContext()).toBe(false);
    expect(getAgentContext()).toContain('# ICP');
  });

  it('guarda el contexto editado y lo devuelve', () => {
    saveAgentContext('# Mi propio contexto');

    expect(hasStoredAgentContext()).toBe(true);
    expect(getAgentContext()).toBe('# Mi propio contexto');
  });

  it('al restablecer vuelve al contexto por defecto', () => {
    saveAgentContext('# Mi propio contexto');
    resetAgentContext();

    expect(hasStoredAgentContext()).toBe(false);
    expect(getAgentContext()).toContain('# Tono y estilo');
  });

  it('un contexto vacío guardado se respeta tal cual', () => {
    // Si el analista borra todo, es una decisión suya: no se le devuelve el
    // texto por defecto a la fuerza.
    saveAgentContext('');

    expect(hasStoredAgentContext()).toBe(true);
    expect(getAgentContext()).toBe('');
  });
});

describe('rutas auxiliares', () => {
  it('el health check responde que está en pie', async () => {
    vi.resetModules();
    const { GET } = await import('@/app/api/health/route');

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('cerrar sesión borra la cookie', async () => {
    vi.resetModules();
    const { POST } = await import('@/app/api/auth/logout/route');

    const res = await POST();

    expect(res.status).toBe(200);
    // Una cookie borrada se envía vacía y caducada.
    expect(res.cookies.get('cm-agent-token')?.value).toBe('');
  });
});
