import { dayKey } from './day-key';

/**
 * Presupuesto diario de llamadas al modelo.
 *
 * El límite que ya existía vivía en `localStorage`, del lado del navegador: un
 * tope de cortesía que cualquiera puede borrar desde las herramientas de
 * desarrollo. Este cuenta en el servidor, que es el que paga (RNF-06).
 *
 * Cuando el presupuesto se agota, la app no se cae ni se queda muda: responde
 * con el guion de demostración y lo dice en pantalla.
 */

export type BudgetState = {
  allowed: boolean;
  /** Llamadas que quedan hoy. */
  remaining: number;
  /** Llamadas ya consumidas hoy. */
  used: number;
  limit: number;
};

export type ModelBudget = {
  /** Reserva una llamada. Devuelve `allowed: false` si ya no hay cupo. */
  consume: () => BudgetState;
  /** Consulta el estado sin consumir. */
  peek: () => BudgetState;
  /** Devuelve una llamada al presupuesto (por ejemplo, si el modelo falló antes de responder). */
  refund: () => void;
  reset: () => void;
};

export type ModelBudgetOptions = {
  limit: number;
  now?: () => Date;
};

export function createModelBudget({ limit, now = () => new Date() }: ModelBudgetOptions): ModelBudget {
  let currentDay = dayKey(now());
  let used = 0;

  function rollOverIfNewDay(): void {
    const today = dayKey(now());
    if (today !== currentDay) {
      currentDay = today;
      used = 0;
    }
  }

  function state(allowed: boolean): BudgetState {
    return { allowed, remaining: Math.max(0, limit - used), used, limit };
  }

  return {
    consume(): BudgetState {
      rollOverIfNewDay();
      if (used >= limit) return state(false);
      used += 1;
      return state(true);
    },

    peek(): BudgetState {
      rollOverIfNewDay();
      return state(used < limit);
    },

    refund(): void {
      rollOverIfNewDay();
      if (used > 0) used -= 1;
    },

    reset(): void {
      currentDay = dayKey(now());
      used = 0;
    },
  };
}
