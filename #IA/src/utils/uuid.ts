const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Os ids do banco são `uuid()` (S6-1); o backend responde 400 para qualquer outra forma. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
