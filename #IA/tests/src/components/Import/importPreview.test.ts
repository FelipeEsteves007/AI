import { buildPreview } from '@/components/Import/importPreview';
import { parseCsv, toCsv } from '@/utils/csv';

describe('buildPreview', () => {
  it('marca ✓, ⚠ e ✗ e mostra no máximo 5 linhas', () => {
    const csv = [
      'nome;e-mail;cpf;status',
      'Ana;ana@x.com;529.982.247-25;ativo',
      ';semnome@x.com;;',
      'Bia;nao-e-email;;',
      'Caio;caio@x.com;123;',
      'Duda;duda@x.com;;cancelado',
      'Edu;edu@x.com;;',
      'Fora;fora@x.com;;',
    ].join('\n');

    const preview = buildPreview(csv);

    expect(preview.totalRows).toBe(7);
    expect(preview.fileError).toBeNull();
    expect(preview.rows.map((row) => [row.row, row.mark, row.reason])).toEqual([
      [2, 'ok', null],
      [3, 'error', 'Nome obrigatório'],
      [4, 'error', 'E-mail inválido'],
      [5, 'warning', 'CPF com formato estranho'],
      [6, 'warning', 'Status desconhecido'],
    ]);
  });

  it('arquivo vazio ou sem as colunas obrigatórias', () => {
    expect(buildPreview('\n').fileError).toBe('O arquivo CSV está vazio.');
    expect(buildPreview('nome,telefone\nAna,1').fileError).toMatch(/precisa das colunas/);
  });
});

describe('csv do frontend', () => {
  it('parseCsv trata aspas e BOM', () => {
    expect(parseCsv('﻿a,b\n"x, y","z ""w"""')).toEqual([
      ['a', 'b'],
      ['x, y', 'z "w"'],
    ]);
  });

  it('toCsv põe aspas só quando precisa', () => {
    expect(toCsv([['linha', 'nome'], [3, 'Silva, "Ana"']])).toBe('linha,nome\n3,"Silva, ""Ana"""');
  });
});
