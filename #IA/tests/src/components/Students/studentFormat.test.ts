import {
  formatCpf,
  formatCurrency,
  formatDate,
  formatDateOnly,
  formatDateTime,
  LEAD_STATUS_LABELS,
} from '@/components/Students/studentFormat';

describe('studentFormat', () => {
  it('formata CPF de 11 dígitos e devolve traço sem CPF', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09');
    expect(formatCpf(null)).toBe('—');
    expect(formatCpf('123')).toBe('123');
  });

  it('formata data ISO e devolve traço quando inválida', () => {
    expect(formatDate('não é data')).toBe('—');
  });

  it('formata data sem hora sem deslocar o fuso', () => {
    expect(formatDateOnly('2026-09-01')).toBe('01/09/2026');
    expect(formatDateOnly('2026-9-1')).toBe('2026-9-1');
  });

  it('formata data e hora', () => {
    expect(formatDateTime('2026-09-12T14:30:00.000Z')).toMatch(/12\/09\/2026/);
    expect(formatDateTime('lixo')).toBe('—');
  });

  it('formata valores em reais', () => {
    expect(formatCurrency(297.5)).toMatch(/^R\$\s297,50$/);
    expect(formatCurrency(1500)).toMatch(/^R\$\s1\.500,00$/);
  });

  it('traduz o status do lead', () => {
    expect(LEAD_STATUS_LABELS).toEqual({
      prospecting: 'Prospecção',
      negotiation: 'Negociação',
      sold: 'Vendido',
      lost: 'Perdido',
    });
  });
});
