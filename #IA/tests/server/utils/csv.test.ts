import { detectDelimiter, parseCsv } from '@server/utils/csv';

describe('parseCsv', () => {
  it('lê vírgula, CRLF e ignora linhas vazias', () => {
    expect(parseCsv('name,email\r\nAna,ana@x.com\r\n\r\nBia,bia@x.com\r\n')).toEqual([
      ['name', 'email'],
      ['Ana', 'ana@x.com'],
      ['Bia', 'bia@x.com'],
    ]);
  });

  it('detecta ponto e vírgula (Excel em português) e remove o BOM', () => {
    const text = '﻿nome;e-mail\nJoão, o Jr.;joao@x.com';

    expect(detectDelimiter(text)).toBe(';');
    expect(parseCsv(text)).toEqual([
      ['nome', 'e-mail'],
      ['João, o Jr.', 'joao@x.com'],
    ]);
  });

  it('aspas com separador, aspa escapada e quebra de linha dentro', () => {
    expect(parseCsv('a,b\n"Silva, Ana","Diz ""oi""\nnovo"')).toEqual([
      ['a', 'b'],
      ['Silva, Ana', 'Diz "oi"\nnovo'],
    ]);
  });

  it('última linha sem quebra e campo final vazio', () => {
    expect(parseCsv('a,b\n1,')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });
});
