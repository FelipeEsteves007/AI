/** Fuso de referência do negócio: "hoje" é o dia no Brasil, não em UTC. */
export const BUSINESS_TIME_ZONE = 'America/Sao_Paulo';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje no fuso do negócio, como `YYYY-MM-DD`. */
export function todayDateOnly(now: Date = new Date()): string {
  // `en-CA` formata como `YYYY-MM-DD`.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Verdadeiro para `YYYY-MM-DD` que existe no calendário (recusa `2026-02-30`). */
export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** `YYYY-MM-DD` → `Date` à meia-noite UTC, como a coluna `@db.Date` guarda. */
export function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Soma dias a um `YYYY-MM-DD` (negativo subtrai). */
export function addDays(value: string, days: number): string {
  const date = dateOnlyToDate(value);

  date.setUTCDate(date.getUTCDate() + days);

  return dateToDateOnly(date);
}

/**
 * Início e fim de um dia do negócio como instantes. O Brasil está sem horário de verão desde
 * 2019, então o deslocamento fixo `-03:00` basta.
 */
export function businessDayBounds(value: string): { start: Date; end: Date } {
  return {
    start: new Date(`${value}T00:00:00.000-03:00`),
    end: new Date(`${value}T23:59:59.999-03:00`),
  };
}

/** `Date` de coluna `@db.Date` → `YYYY-MM-DD`. */
export function dateToDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
