/**
 * Clave del día en la zona de la operación.
 *
 * Todo lo que se cuenta "por día" (el presupuesto de llamadas al modelo, la
 * caché de noticias, el límite diario de propuestas) tiene que cortar a la
 * medianoche de México, no a la del servidor: la demo corre en Railway, cuyo
 * reloj está en UTC, y con `new Date().getDate()` el día cambiaba a las 18:00
 * hora local.
 */

const TIME_ZONE = 'America/Mexico_City';

/** Fecha en formato YYYY-MM-DD según la zona de la operación. */
export function dayKey(date: Date = new Date(), timeZone: string = TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
