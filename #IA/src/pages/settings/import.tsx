import Link from 'next/link';
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

import { buildPreview } from '@/components/Import/importPreview';
import type { ImportPreview, PreviewMark } from '@/components/Import/importPreview';
import { formatCount } from '@/components/Students/studentFormat';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';
import { importStudents } from '@/services/importService';
import type { StudentImportResponse } from '@/types/students';
import { toCsv } from '@/utils/csv';

const MARKS: Readonly<Record<PreviewMark, { icon: string; label: string; className: string }>> = {
  ok: { icon: '✓', label: 'Linha pronta', className: 'text-green-700' },
  warning: { icon: '⚠', label: 'Linha com alerta', className: 'text-amber-600' },
  error: { icon: '✗', label: 'Linha inválida', className: 'text-red-700' },
};

interface SelectedFile {
  name: string;
  text: string;
  preview: ImportPreview;
}

function importErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const details = error.details as Record<string, string> | undefined;
    if (typeof details?.file === 'string') return details.file;
    if (error.status === 403) return 'Você não tem permissão para importar alunos.';
  }
  return 'Não foi possível importar agora. Tente novamente em instantes.';
}

/** Lê o arquivo como texto UTF-8 (`FileReader` funciona em todo navegador e no jsdom). */
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo'));
    reader.readAsText(file, 'utf-8');
  });
}

/** Baixa o relatório de erros como CSV (linha, nome, motivo). */
function downloadErrors(report: StudentImportResponse): void {
  const csv = toCsv([
    ['linha', 'nome', 'erro'],
    ...report.errors.map((error) => [error.row, error.name, error.error]),
  ]);
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'erros-importacao.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Página `/settings/import` (TASK-013): upload de CSV, preview, importação e relatório. */
export default function ImportPage(): JSX.Element {
  const { can } = useAuth();
  // Cosmético: o backend responde 403 sem `students:import`.
  const allowed = can('students:import');

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<StudentImportResponse | null>(null);

  if (!allowed) {
    return (
      <section className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">Importar alunos</h1>
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Acesso negado: só administradores podem importar alunos.
        </p>
      </section>
    );
  }

  async function selectFile(selected: File | undefined): Promise<void> {
    if (!selected) return;
    setError(null);
    setReport(null);
    try {
      const text = await readFileText(selected);
      setFile({ name: selected.name, text, preview: buildPreview(text) });
    } catch {
      setError('Não foi possível ler o arquivo selecionado.');
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setIsDragging(false);
    void selectFile(event.dataTransfer.files[0]);
  }

  async function startImport(): Promise<void> {
    if (!file) return;
    setIsImporting(true);
    setError(null);
    try {
      setReport(await importStudents(file.text));
      setFile(null);
    } catch (caught) {
      setError(importErrorMessage(caught));
    } finally {
      setIsImporting(false);
    }
  }

  const canImport = file !== null && file.preview.fileError === null && file.preview.totalRows > 0;

  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Importar alunos</h1>
      <p className="mt-1 text-sm text-gray-500">
        CSV com as colunas <code>name</code>, <code>email</code>, <code>phone</code>,{' '}
        <code>cpf</code>, <code>status</code> e <code>assigned_to_email</code> (também aceita
        cabeçalhos em português e separador <code>;</code>). Até 10.000 alunos por arquivo.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Selecionar arquivo CSV"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
      >
        <p className="text-sm font-medium text-gray-900">
          {file ? file.name : 'Arraste o CSV aqui ou clique para escolher'}
        </p>
        <p className="mt-1 text-xs text-gray-500">Somente arquivos .csv</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          data-testid="import-file-input"
          className="hidden"
          onChange={(event) => {
            void selectFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {file ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          {file.preview.fileError ? (
            <p className="text-sm text-red-700">{file.preview.fileError}</p>
          ) : (
            <>
              <h2 className="text-base font-semibold text-gray-900">
                Preview — {formatCount(file.preview.totalRows)}{' '}
                {file.preview.totalRows === 1 ? 'linha' : 'linhas'} no arquivo
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="text-left text-xs font-semibold uppercase text-gray-500">
                    <tr>
                      <th scope="col" className="px-3 py-2">
                        <span className="sr-only">Validação</span>
                      </th>
                      <th scope="col" className="px-3 py-2">Linha</th>
                      <th scope="col" className="px-3 py-2">Nome</th>
                      <th scope="col" className="px-3 py-2">E-mail</th>
                      <th scope="col" className="px-3 py-2">CPF</th>
                      <th scope="col" className="px-3 py-2">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {file.preview.rows.map((row) => {
                      const mark = MARKS[row.mark];
                      return (
                        <tr key={row.row}>
                          <td className={`px-3 py-2 font-bold ${mark.className}`}>
                            <span aria-label={mark.label} title={mark.label}>
                              {mark.icon}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-500">{row.row}</td>
                          <td className="px-3 py-2 text-gray-900">{row.name || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.email || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.cpf || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.reason ?? ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {isImporting ? (
            <div className="mt-4" aria-live="polite">
              <p className="text-sm text-gray-700">Importando alunos…</p>
              <div
                role="progressbar"
                aria-label="Progresso da importação"
                className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200"
              >
                <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={isImporting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void startImport();
              }}
              disabled={!canImport || isImporting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isImporting ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </div>
      ) : null}

      {report ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5" aria-live="polite">
          <h2 className="text-base font-semibold text-gray-900">Resultado da importação</h2>
          <p className="mt-1 text-sm text-gray-600">{report.summary}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-green-50 p-3">
              <dt className="text-xs font-medium uppercase text-green-700">Importados</dt>
              <dd className="text-2xl font-bold text-green-800">{formatCount(report.imported)}</dd>
            </div>
            <div className="rounded-md bg-red-50 p-3">
              <dt className="text-xs font-medium uppercase text-red-700">Falhas</dt>
              <dd className="text-2xl font-bold text-red-800">{formatCount(report.failed)}</dd>
            </div>
            <div className="rounded-md bg-amber-50 p-3">
              <dt className="text-xs font-medium uppercase text-amber-700">Duplicatas</dt>
              <dd className="text-2xl font-bold text-amber-800">{formatCount(report.duplicates)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.errors.length > 0 ? (
              <button
                type="button"
                onClick={() => downloadErrors(report)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Baixar relatório de erros (CSV)
              </button>
            ) : null}
            <Link
              href="/students"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver alunos
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
