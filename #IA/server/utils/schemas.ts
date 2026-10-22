import { z } from 'zod';

import { isValidDateOnly } from '@server/utils/dates';

/** `:id` de caminho em uuid. */
export const idParamsSchema = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

/** `YYYY-MM-DD` que existe no calendário. */
export const dateOnlySchema = (error: string) =>
  z.string({ error }).refine(isValidDateOnly, { error: `${error}: use AAAA-MM-DD` });

/** Texto opcional até `max`: vazio vira `null`. */
export const optionalTextSchema = (error: string, max: number) =>
  z
    .string({ error })
    .trim()
    .max(max, { error: `Máximo de ${max} caracteres` })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

/** Query booleana (`true`/`false`) opcional. */
export const booleanQuerySchema = z
  .enum(['true', 'false'], { error: 'Use true ou false' })
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));
