import { describe, expect, it } from 'vitest';
import { createModelBudget } from '@/lib/model-budget';
import { dayKey } from '@/lib/day-key';

function relojControlado(inicio: string) {
  let fecha = new Date(inicio);
  return {
    now: () => fecha,
    avanzarHoras(horas: number) {
      fecha = new Date(fecha.getTime() + horas * 60 * 60 * 1000);
    },
  };
}

describe('createModelBudget (RNF-06)', () => {
  it('permite consumir hasta el límite', () => {
    const budget = createModelBudget({ limit: 2 });

    expect(budget.consume().allowed).toBe(true);
    expect(budget.consume().allowed).toBe(true);
    expect(budget.consume().allowed).toBe(false);
  });

  it('informa cuánto queda y cuánto se usó', () => {
    const budget = createModelBudget({ limit: 3 });

    const primero = budget.consume();
    expect(primero.used).toBe(1);
    expect(primero.remaining).toBe(2);
    expect(primero.limit).toBe(3);
  });

  it('peek no consume', () => {
    const budget = createModelBudget({ limit: 1 });

    expect(budget.peek().used).toBe(0);
    expect(budget.peek().allowed).toBe(true);
    expect(budget.consume().allowed).toBe(true);
    expect(budget.peek().allowed).toBe(false);
  });

  it('refund devuelve un cupo cuando la llamada no llegó a responder', () => {
    const budget = createModelBudget({ limit: 1 });

    budget.consume();
    expect(budget.peek().allowed).toBe(false);

    budget.refund();
    expect(budget.peek().allowed).toBe(true);
  });

  it('refund no baja de cero', () => {
    const budget = createModelBudget({ limit: 2 });

    budget.refund();
    budget.refund();

    expect(budget.peek().used).toBe(0);
    expect(budget.peek().remaining).toBe(2);
  });

  it('se reinicia al cambiar el día en México, no en UTC', () => {
    // 23:30 del día 1 en Ciudad de México son las 05:30 UTC del día 2.
    const reloj = relojControlado('2026-10-02T05:30:00Z');
    const budget = createModelBudget({ limit: 1, now: reloj.now });

    expect(dayKey(reloj.now())).toBe('2026-10-01');
    budget.consume();
    expect(budget.peek().allowed).toBe(false);

    // Una hora después ya es el día 2 en México: el presupuesto vuelve a abrir.
    reloj.avanzarHoras(1);
    expect(dayKey(reloj.now())).toBe('2026-10-02');
    expect(budget.peek().allowed).toBe(true);
    expect(budget.consume().allowed).toBe(true);
  });

  it('no se reinicia por cambiar de hora dentro del mismo día', () => {
    const reloj = relojControlado('2026-10-02T15:00:00Z');
    const budget = createModelBudget({ limit: 1, now: reloj.now });

    budget.consume();
    reloj.avanzarHoras(3);

    expect(budget.peek().allowed).toBe(false);
  });

  it('reset vacía el contador', () => {
    const budget = createModelBudget({ limit: 1 });

    budget.consume();
    budget.reset();

    expect(budget.peek().allowed).toBe(true);
  });
});
