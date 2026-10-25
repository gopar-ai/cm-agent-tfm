import { describe, expect, it } from 'vitest';
import { clientIpFrom, createRateLimiter } from '@/lib/rate-limit';

/** El reloj se inyecta: las pruebas simulan el paso del tiempo sin esperarlo. */
function relojControlado(inicio = 1_700_000_000_000) {
  let ahora = inicio;
  return {
    now: () => ahora,
    avanzarSegundos(segundos: number) {
      ahora += segundos * 1000;
    },
  };
}

describe('createRateLimiter (RNF-05)', () => {
  it('permite hasta el máximo configurado', () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowSeconds: 60 });

    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);
  });

  it('informa cuántos intentos quedan', () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowSeconds: 60 });

    expect(limiter.check('ip').remaining).toBe(2);
    expect(limiter.check('ip').remaining).toBe(1);
    expect(limiter.check('ip').remaining).toBe(0);
  });

  it('cuenta cada clave por separado', () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowSeconds: 60 });

    expect(limiter.check('ip-a').allowed).toBe(true);
    expect(limiter.check('ip-b').allowed).toBe(true);
    expect(limiter.check('ip-a').allowed).toBe(false);
  });

  it('dice cuántos segundos faltan para volver a intentar', () => {
    const reloj = relojControlado();
    const limiter = createRateLimiter({ maxAttempts: 1, windowSeconds: 300, now: reloj.now });

    limiter.check('ip');
    reloj.avanzarSegundos(60);

    const bloqueado = limiter.check('ip');
    expect(bloqueado.allowed).toBe(false);
    expect(bloqueado.retryAfterSeconds).toBe(240);
  });

  it('libera el cupo cuando la ventana pasa', () => {
    const reloj = relojControlado();
    const limiter = createRateLimiter({ maxAttempts: 2, windowSeconds: 60, now: reloj.now });

    limiter.check('ip');
    limiter.check('ip');
    expect(limiter.check('ip').allowed).toBe(false);

    reloj.avanzarSegundos(61);
    expect(limiter.check('ip').allowed).toBe(true);
  });

  it('desliza la ventana en vez de vaciarla de golpe', () => {
    const reloj = relojControlado();
    const limiter = createRateLimiter({ maxAttempts: 2, windowSeconds: 60, now: reloj.now });

    limiter.check('ip'); // t=0
    reloj.avanzarSegundos(40);
    limiter.check('ip'); // t=40
    expect(limiter.check('ip').allowed).toBe(false);

    // A t=61 caduca el primero, pero el segundo sigue contando.
    reloj.avanzarSegundos(21);
    expect(limiter.check('ip').allowed).toBe(true);
    expect(limiter.check('ip').allowed).toBe(false);
  });

  it('reset borra los intentos de una clave y deja intactas las demás', () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowSeconds: 60 });

    limiter.check('ip-a');
    limiter.check('ip-b');
    limiter.reset('ip-a');

    expect(limiter.check('ip-a').allowed).toBe(true);
    expect(limiter.check('ip-b').allowed).toBe(false);
  });

  it('clear vacía todo el estado', () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowSeconds: 60 });

    limiter.check('ip-a');
    limiter.clear();

    expect(limiter.check('ip-a').allowed).toBe(true);
  });

  it('no crece sin límite cuando se rotan las claves', () => {
    const reloj = relojControlado();
    const limiter = createRateLimiter({ maxAttempts: 1, windowSeconds: 1, now: reloj.now });

    for (let i = 0; i < 10_050; i++) limiter.check(`ip-${i}`);

    // Pasada la ventana, las claves viejas se purgan y la nueva entra limpia.
    reloj.avanzarSegundos(2);
    expect(limiter.check('ip-nueva').allowed).toBe(true);
  });
});

describe('clientIpFrom', () => {
  it('toma el primer salto de x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1, 10.0.0.2' });
    expect(clientIpFrom(headers)).toBe('203.0.113.5');
  });

  it('usa x-real-ip cuando no hay x-forwarded-for', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('devuelve un valor fijo cuando no hay cabeceras', () => {
    expect(clientIpFrom(new Headers())).toBe('desconocida');
  });

  it('ignora una cabecera vacía', () => {
    expect(clientIpFrom(new Headers({ 'x-forwarded-for': '  ' }))).toBe('desconocida');
  });
});
