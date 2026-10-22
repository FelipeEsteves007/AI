import type { PipelineLeadStatus, StudentStatus } from '@/types/students';

export const STATUS_LABELS: Readonly<Record<StudentStatus, string>> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  pausado: 'Pausado',
};

export const STATUS_OPTIONS: readonly StudentStatus[] = ['ativo', 'inativo', 'pausado'];

export function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === 'string' && (STATUS_OPTIONS as readonly string[]).includes(value);
}

/** `12345678909` → `123.456.789-09`. Qualquer outra forma volta como veio. */
export function formatCpf(cpf: string | null): string {
  if (!cpf) {
    return '—';
  }
  return /^\d{11}$/.test(cpf) ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
}

/** ISO 8601 → `dd/mm/aaaa`. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

export function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

/** `YYYY-MM-DD` → `dd/mm/aaaa`, sem passar por `Date` (que deslocaria o dia pelo fuso). */
export function formatDateOnly(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** ISO 8601 → `dd/mm/aaaa hh:mm`. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export const LEAD_STATUS_LABELS: Readonly<Record<PipelineLeadStatus, string>> = {
  prospecting: 'Prospecção',
  negotiation: 'Negociação',
  sold: 'Vendido',
  lost: 'Perdido',
};
