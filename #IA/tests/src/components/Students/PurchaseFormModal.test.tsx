import { act, fireEvent, render, screen, within } from '@testing-library/react';

import { PurchaseFormModal } from '@/components/Students/PurchaseFormModal';
import { ApiError } from '@/services/apiClient';
import type { CourseResponse } from '@/types/courses';

const listCourses = jest.fn();

jest.mock('@/services/coursesService', () => ({
  listCourses: (...args: unknown[]) => listCourses(...args),
}));

function course(id: string, name: string, price: number): CourseResponse {
  return {
    id,
    name,
    description: null,
    price,
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  };
}

const TODAY = '2026-09-14';
const OWNED: string[] = ['c-owned'];
const onSubmit = jest.fn();
const onClose = jest.fn();

async function renderModal(): Promise<HTMLElement> {
  render(
    <PurchaseFormModal ownedCourseIds={OWNED} today={TODAY} onSubmit={onSubmit} onClose={onClose} />,
  );
  const dialog = screen.getByRole('dialog', { name: 'Adicionar curso' });
  await within(dialog).findByRole('option', { name: 'Delphi' });
  return dialog;
}

beforeEach(() => {
  listCourses.mockReset().mockResolvedValue({
    data: [course('c-1', 'Delphi', 497), course('c-owned', 'Já comprado', 10)],
    pagination: { page: 1, limit: 500, total: 2, totalPages: 1 },
  });
  onSubmit.mockReset().mockResolvedValue(undefined);
  onClose.mockReset();
});

describe('PurchaseFormModal', () => {
  it('só lista cursos ativos que o aluno ainda não tem', async () => {
    const dialog = await renderModal();

    expect(listCourses).toHaveBeenCalledWith({ isActive: true, limit: 500 });
    expect(within(dialog).queryByRole('option', { name: 'Já comprado' })).not.toBeInTheDocument();
  });

  it('data padrão hoje, valor padrão o preço do curso, e envia normalizado', async () => {
    const dialog = await renderModal();

    expect(within(dialog).getByLabelText('Data da compra')).toHaveValue(TODAY);
    fireEvent.change(within(dialog).getByLabelText('Curso'), { target: { value: 'c-1' } });
    expect(within(dialog).getByLabelText('Valor (R$)')).toHaveValue('497,00');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(onSubmit).toHaveBeenCalledWith({
      courseId: 'c-1',
      purchaseDate: TODAY,
      amount: '497.00',
      notes: null,
    });
  });

  it('recusa sem curso e com data futura, sem chamar a API', async () => {
    const dialog = await renderModal();

    fireEvent.change(within(dialog).getByLabelText('Data da compra'), {
      target: { value: '2026-09-15' },
    });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(within(dialog).getByText('Escolha o curso.')).toBeInTheDocument();
    expect(within(dialog).getByText('A data da compra não pode ser futura.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('409 de compra duplicada aparece no campo do curso', async () => {
    onSubmit.mockRejectedValue(new ApiError(409, 'PURCHASE_DUPLICATE', 'x'));
    const dialog = await renderModal();

    fireEvent.change(within(dialog).getByLabelText('Curso'), { target: { value: 'c-1' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    });

    expect(within(dialog).getByText('O aluno já comprou este curso.')).toBeInTheDocument();
  });

  it('Cancelar fecha', async () => {
    const dialog = await renderModal();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
