/** Hoje no fuso do negócio (Brasil), como `YYYY-MM-DD` — mesmo critério do backend. */
export function todayDateOnly(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
