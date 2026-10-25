import { describe, expect, it } from 'vitest';
import { dayKey } from '@/lib/day-key';

describe('dayKey', () => {
  it('da la fecha en formato YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-03-07T18:00:00Z'))).toBe('2026-03-07');
  });

  it('usa la zona de México, no la del servidor', () => {
    // 04:00 UTC del día 8 todavía es el día 7 en Ciudad de México.
    expect(dayKey(new Date('2026-03-08T04:00:00Z'))).toBe('2026-03-07');
  });

  it('cambia de día a la medianoche de México', () => {
    expect(dayKey(new Date('2026-03-08T05:59:00Z'))).toBe('2026-03-07');
    expect(dayKey(new Date('2026-03-08T06:01:00Z'))).toBe('2026-03-08');
  });

  it('rellena mes y día con dos dígitos', () => {
    expect(dayKey(new Date('2026-01-05T18:00:00Z'))).toBe('2026-01-05');
  });

  it('acepta otra zona cuando se le pasa', () => {
    expect(dayKey(new Date('2026-03-08T04:00:00Z'), 'UTC')).toBe('2026-03-08');
  });

  it('cruza bien el fin de año', () => {
    expect(dayKey(new Date('2027-01-01T05:00:00Z'))).toBe('2026-12-31');
  });
});
