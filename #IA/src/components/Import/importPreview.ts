import { parseCsv } from '@/utils/csv';

/** ✓ pronta, ⚠ provável falha (CPF ou status), ✗ falha certa (nome ou e-mail). */
export type PreviewMark = 'ok' | 'warning' | 'error';

export interface PreviewRow {
  row: number;
  name: string;
  email: string;
  cpf: string;
  mark: PreviewMark;
  reason: string | null;
}

export interface ImportPreview {
  /** Linhas de dados (sem o cabeçalho). */
  totalRows: number;
  rows: PreviewRow[];
  /** Mensagem quando o arquivo nem chega a ser importável. */
  fileError: string | null;
}

const PREVIEW_SIZE = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUSES = ['ativo', 'inativo', 'pausado'];

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function indexOf(header: string[], ...names: string[]): number {
  return header.findIndex((value) => names.includes(normalizeHeader(value)));
}

/**
 * Preview das 5 primeiras linhas (TASK-013). É só uma ajuda visual: quem valida de verdade é o
 * backend, que devolve o relatório final.
 */
export function buildPreview(text: string): ImportPreview {
  const [header, ...lines] = parseCsv(text);

  if (!header) {
    return { totalRows: 0, rows: [], fileError: 'O arquivo CSV está vazio.' };
  }

  const nameIndex = indexOf(header, 'name', 'nome');
  const emailIndex = indexOf(header, 'email', 'e-mail');
  const cpfIndex = indexOf(header, 'cpf');
  const statusIndex = indexOf(header, 'status');

  if (nameIndex === -1 || emailIndex === -1) {
    return {
      totalRows: lines.length,
      rows: [],
      fileError: 'O CSV precisa das colunas name e email (ou nome e e-mail).',
    };
  }

  const cell = (values: string[], index: number) => (index === -1 ? '' : (values[index] ?? '').trim());

  const rows = lines.slice(0, PREVIEW_SIZE).map((values, i): PreviewRow => {
    const name = cell(values, nameIndex);
    const email = cell(values, emailIndex);
    const cpf = cell(values, cpfIndex);
    const status = cell(values, statusIndex).toLowerCase();
    const base = { row: i + 2, name, email, cpf };

    if (!name) return { ...base, mark: 'error', reason: 'Nome obrigatório' };
    if (!EMAIL_PATTERN.test(email)) return { ...base, mark: 'error', reason: 'E-mail inválido' };
    if (cpf && cpf.replace(/\D/g, '').length !== 11) {
      return { ...base, mark: 'warning', reason: 'CPF com formato estranho' };
    }
    if (status && !STATUSES.includes(status)) {
      return { ...base, mark: 'warning', reason: 'Status desconhecido' };
    }
    return { ...base, mark: 'ok', reason: null };
  });

  return { totalRows: lines.length, rows, fileError: null };
}
