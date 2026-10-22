import { z } from 'zod';

/** Até 8 dígitos inteiros (coluna `Decimal(10, 2)`) e até 2 casas decimais. */
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

/**
 * Valor em dinheiro vindo do JSON: aceita número (`997.5`) ou string (`"997.50"`), recusa
 * negativo e mais de 2 casas, e devolve string decimal com 2 casas (`"997.50"`).
 */
export function moneySchema(error: string) {
  return z
    .union([z.number({ error }), z.string({ error })], { error })
    .transform((value) => (typeof value === 'number' ? String(value) : value.trim()))
    .refine((value) => MONEY_PATTERN.test(value), { error })
    .transform((value) => Number(value).toFixed(2));
}
