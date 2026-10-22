import { resolveLogLevel } from '@server/utils/logger';

describe('resolveLogLevel', () => {
  it('aceita nível válido e limpa BOM e espaços (valor colado pelo PowerShell)', () => {
    expect(resolveLogLevel({ LOG_LEVEL: '﻿info' })).toBe('info');
    expect(resolveLogLevel({ LOG_LEVEL: ' WARN\r\n' })).toBe('warn');
  });

  it('nível inválido ou ausente cai no padrão, sem lançar', () => {
    expect(resolveLogLevel({ LOG_LEVEL: 'verboso' })).toBe('info');
    expect(resolveLogLevel({ NODE_ENV: 'test' })).toBe('silent');
  });
});
