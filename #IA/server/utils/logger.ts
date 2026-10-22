import pino from 'pino';

/**
 * Logger da API (decisão da Sprint 9: Pino). Nunca `console.log` em produção.
 * Nível por `LOG_LEVEL`; nos testes (`NODE_ENV=test`) fica mudo por padrão.
 */
const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

/**
 * Nível lido do ambiente, tolerante a lixo invisível (BOM, espaços): um `LOG_LEVEL` inválido não pode
 * derrubar a API na importação do módulo — cai no padrão.
 */
export function resolveLogLevel(
  env: Partial<Record<'LOG_LEVEL' | 'NODE_ENV', string>> = process.env,
): string {
  const requested = env.LOG_LEVEL?.replace(/[﻿\s]/g, '').toLowerCase();
  if (requested && LEVELS.includes(requested)) {
    return requested;
  }
  return env.NODE_ENV === 'test' ? 'silent' : 'info';
}

export const logger = pino({
  level: resolveLogLevel(),
  base: { service: 'crm-alunos-api' },
  redact: ['req.headers.cookie', 'password', 'passwordHash', '*.password'],
});
