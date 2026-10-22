/**
 * Parser de CSV sem dependência: aspas duplas (com `""` como aspa escapada), quebra de linha
 * dentro de aspas, `\r\n` ou `\n`, e BOM do Excel. O separador é detectado na primeira linha:
 * `;` (padrão do Excel em português) quando aparece mais que `,`.
 */
export function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/, 1)[0] ?? '';
  const count = (char: string) => firstLine.split(char).length - 1;

  return count(';') > count(',') ? ';' : ',';
}

/** Linhas do CSV como listas de campos, sem as linhas totalmente vazias. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const source = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endRow = () => {
    row.push(field);
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
    row = [];
    field = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      endRow();
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    endRow();
  }

  return rows;
}
