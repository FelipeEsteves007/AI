/**
 * Parser de CSV do preview da importação. Mesmas regras de `api/utils/csv.ts` (aspas, `""`,
 * quebra de linha dentro de aspas, BOM, `;` ou `,` detectado na primeira linha): o frontend
 * não importa código de `api/`, então a regra é repetida aqui.
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
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

/** Monta um CSV com `,`, pondo aspas só onde precisa. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}
