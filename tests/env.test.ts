import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '@/lib/env';
import { hashPassword, verifyPassword } from '@/lib/security';

/**
 * `parseServerEnv` es puro: recibe las variables como argumento. Así se puede
 * probar el comportamiento en producción sin cambiar el entorno del proceso.
 */

const produccionCompleta = {
  NODE_ENV: 'production',
  APP_USERNAME: 'analista',
  APP_PASSWORD_HASH: hashPassword('contraseña-de-produccion'),
  JWT_SECRET: 'x'.repeat(32),
  ANTHROPIC_API_KEY: 'sk-ant-de-prueba',
};

describe('parseServerEnv fuera de producción (RNF-09)', () => {
  it('rellena usuario, contraseña y secreto para que un clon nuevo arranque', () => {
    const env = parseServerEnv({ NODE_ENV: 'development' });

    expect(env.username).toBe('demo');
    expect(env.jwtSecret).toBeTruthy();
    expect(verifyPassword('demo1234', env.passwordHash as string)).toBe(true);
  });

  it('sin clave de API deja el agente en modo demostración', () => {
    const env = parseServerEnv({ NODE_ENV: 'development' });
    expect(env.useDemoAgent).toBe(true);
    expect(env.demoMode).toBe(false);
  });

  it('con clave de API usa el modelo real', () => {
    const env = parseServerEnv({ NODE_ENV: 'development', ANTHROPIC_API_KEY: 'sk-ant-xxx' });
    expect(env.useDemoAgent).toBe(false);
  });

  it('DEMO_MODE fuerza la demostración aunque haya clave', () => {
    const env = parseServerEnv({
      NODE_ENV: 'development',
      ANTHROPIC_API_KEY: 'sk-ant-xxx',
      DEMO_MODE: 'true',
    });
    expect(env.useDemoAgent).toBe(true);
    expect(env.demoMode).toBe(true);
  });

  it('el aviso de credenciales de prueba se lee en ejecución', () => {
    // Antes era una variable NEXT_PUBLIC_, que Next fija al construir: en la
    // demo publicada estaba configurada y el aviso no aparecía nunca.
    expect(parseServerEnv({ DEMO_HINT: 'Acceso de prueba: demo / demo1234' }).demoHint).toBe(
      'Acceso de prueba: demo / demo1234'
    );
    expect(parseServerEnv({}).demoHint).toBeUndefined();
    expect(parseServerEnv({ DEMO_HINT: '   ' }).demoHint).toBeUndefined();
  });

  it('entiende las formas habituales de escribir un booleano', () => {
    for (const valor of ['1', 'true', 'TRUE', 'yes', 'si']) {
      expect(parseServerEnv({ DEMO_MODE: valor }).demoMode, valor).toBe(true);
    }
    for (const valor of ['0', 'false', 'no', '']) {
      expect(parseServerEnv({ DEMO_MODE: valor }).demoMode, valor).toBe(false);
    }
  });

  it('genera un secreto distinto en cada arranque de desarrollo', () => {
    const a = parseServerEnv({ NODE_ENV: 'development' }).jwtSecret;
    const b = parseServerEnv({ NODE_ENV: 'development' }).jwtSecret;
    expect(a).not.toBe(b);
  });
});

describe('parseServerEnv en producción (RNF-09)', () => {
  it('acepta una configuración completa', () => {
    const env = parseServerEnv(produccionCompleta);
    expect(env.isProduction).toBe(true);
    expect(env.username).toBe('analista');
    expect(env.useDemoAgent).toBe(false);
  });

  it('falla y nombra lo que falta', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'production' })).toThrowError(/APP_USERNAME/);
    expect(() => parseServerEnv({ NODE_ENV: 'production' })).toThrowError(/JWT_SECRET/);
    expect(() => parseServerEnv({ NODE_ENV: 'production' })).toThrowError(/APP_PASSWORD/);
  });

  it('no acepta un secreto de firma corto', () => {
    expect(() =>
      parseServerEnv({ ...produccionCompleta, JWT_SECRET: 'corto' })
    ).toThrowError(/JWT_SECRET/);
  });

  it('rechaza un hash de contraseña con formato inválido', () => {
    expect(() =>
      parseServerEnv({ ...produccionCompleta, APP_PASSWORD_HASH: 'contraseña-en-claro' })
    ).toThrowError(/APP_PASSWORD_HASH/);
  });

  it('acepta contraseña en claro, la convierte en hash y lo marca como aviso', () => {
    const env = parseServerEnv({
      ...produccionCompleta,
      APP_PASSWORD_HASH: undefined,
      APP_PASSWORD: 'contraseña-en-claro',
    });

    expect(env.plaintextPasswordInProduction).toBe(true);
    expect(verifyPassword('contraseña-en-claro', env.passwordHash as string)).toBe(true);
  });

  it('no acepta una contraseña demasiado corta', () => {
    expect(() =>
      parseServerEnv({ ...produccionCompleta, APP_PASSWORD_HASH: undefined, APP_PASSWORD: 'corta' })
    ).toThrowError(/Configuracion invalida/);
  });

  it('no acepta un secreto de cron corto', () => {
    expect(() => parseServerEnv({ ...produccionCompleta, CRON_SECRET: 'corto' })).toThrowError();
  });
});

describe('límites configurables (RNF-06)', () => {
  it('usa los valores por defecto cuando no se configuran', () => {
    const env = parseServerEnv({});
    expect(env.dailyModelCallBudget).toBe(120);
    expect(env.loginMaxAttempts).toBe(8);
    expect(env.loginWindowSeconds).toBe(300);
    expect(env.chatMaxPerMinute).toBe(10);
  });

  it('toma los valores configurados', () => {
    const env = parseServerEnv({ DAILY_MODEL_CALL_BUDGET: '50', LOGIN_MAX_ATTEMPTS: '3' });
    expect(env.dailyModelCallBudget).toBe(50);
    expect(env.loginMaxAttempts).toBe(3);
  });

  it('ignora valores que no son números positivos y vuelve al defecto', () => {
    for (const valor of ['cero', '-5', '0', '']) {
      expect(parseServerEnv({ DAILY_MODEL_CALL_BUDGET: valor }).dailyModelCallBudget, valor).toBe(120);
    }
  });

  it('redondea un valor decimal hacia abajo', () => {
    expect(parseServerEnv({ CHAT_MAX_PER_MINUTE: '7.9' }).chatMaxPerMinute).toBe(7);
  });

  it('rechaza un NODE_ENV que no existe', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'produccion' })).toThrowError();
  });
});
