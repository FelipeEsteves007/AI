/** Valor em dinheiro digitado: aceita vírgula ou ponto, até 2 casas. */
const MONEY_INPUT = /^\d{1,8}([.,]\d{1,2})?$/;

/** `"1.997,50"` não é aceito (sem separador de milhar); `"1997,5"` → `"1997.50"`. Inválido → `null`. */
export function parseMoneyInput(value: string): string | null {
  const trimmed = value.trim();
  if (!MONEY_INPUT.test(trimmed)) {
    return null;
  }
  return Number(trimmed.replace(',', '.')).toFixed(2);
}

/** Número → texto do campo, com vírgula (`997.5` → `"997,50"`). */
export function formatMoneyInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
