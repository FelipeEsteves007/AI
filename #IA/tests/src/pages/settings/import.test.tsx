import { act, fireEvent, render, screen, within } from '@testing-library/react';

import ImportPage from '@/pages/settings/import';
import { ApiError } from '@/services/apiClient';
import type { StudentImportResponse } from '@/types/students';

const can = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ can, user: { id: 'u-1' } }),
}));

const importStudents = jest.fn();

jest.mock('@/services/importService', () => ({
  importStudents: (...args: unknown[]) => importStudents(...args),
}));

const CSV = 'name,email\nAna,ana@x.com\n,semnome@x.com';

function csvFile(text = CSV, name = 'alunos.csv'): File {
  return new File([text], name, { type: 'text/csv' });
}

async function chooseFile(file: File): Promise<void> {
  fireEvent.change(screen.getByTestId('import-file-input'), { target: { files: [file] } });
  // O `FileReader` é assíncrono: espera o preview (ou o erro de arquivo) aparecer.
  await screen.findByRole('button', { name: 'Importar' }, { timeout: 5000 });
}

const report: StudentImportResponse = {
  imported: 1,
  failed: 1,
  duplicates: 0,
  errors: [{ row: 3, name: '', error: 'Nome obrigatório' }],
  summary: '1 aluno importado. 1 linha inválida. 0 duplicatas.',
};

beforeEach(() => {
  can.mockReset().mockReturnValue(true);
  importStudents.mockReset().mockResolvedValue(report);
});

describe('página de importação', () => {
  it('sem students:import mostra acesso negado', () => {
    can.mockReturnValue(false);
    render(<ImportPage />);

    expect(screen.getByText(/Acesso negado/)).toBeInTheDocument();
  });

  it('upload por clique mostra o preview com as marcas por linha', async () => {
    render(<ImportPage />);
    await chooseFile(csvFile());

    expect(screen.getByText('alunos.csv')).toBeInTheDocument();
    expect(screen.getByText(/2 linhas no arquivo/)).toBeInTheDocument();
    expect(screen.getByLabelText('Linha pronta')).toBeInTheDocument();
    expect(screen.getByLabelText('Linha inválida')).toBeInTheDocument();
    expect(importStudents).not.toHaveBeenCalled();
  });

  it('upload por arrastar também funciona', async () => {
    render(<ImportPage />);
    const zone = screen.getByRole('button', { name: 'Selecionar arquivo CSV' });

    fireEvent.drop(zone, { dataTransfer: { files: [csvFile()] } });

    expect(await screen.findByText(/2 linhas no arquivo/)).toBeInTheDocument();
  });

  it('só importa ao confirmar, e mostra o relatório com download de erros', async () => {
    render(<ImportPage />);
    await chooseFile(csvFile());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    });

    expect(importStudents).toHaveBeenCalledWith(CSV);
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    const importados = screen.getByText('Importados').parentElement as HTMLElement;
    expect(within(importados).getByText('1')).toBeInTheDocument();

    const createObjectURL = jest.fn(() => 'blob:erros');
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: 'Baixar relatório de erros (CSV)' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('mostra a barra de progresso enquanto importa', async () => {
    let finish: (value: StudentImportResponse) => void = () => {};
    importStudents.mockImplementation(
      () => new Promise<StudentImportResponse>((resolve) => (finish = resolve)),
    );
    render(<ImportPage />);
    await chooseFile(csvFile());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    });
    expect(screen.getByRole('progressbar', { name: 'Progresso da importação' })).toBeInTheDocument();

    await act(async () => {
      finish(report);
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('arquivo sem colunas obrigatórias não habilita Importar', async () => {
    render(<ImportPage />);
    await chooseFile(csvFile('nome,telefone\nAna,1'));

    expect(screen.getByText(/precisa das colunas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled();
  });

  it('erro do backend aparece na tela', async () => {
    importStudents.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'x', { file: 'O limite é de 10.000 alunos por importação' }),
    );
    render(<ImportPage />);
    await chooseFile(csvFile());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Importar' }));
    });

    expect(screen.getByText('O limite é de 10.000 alunos por importação')).toBeInTheDocument();
  });
});
