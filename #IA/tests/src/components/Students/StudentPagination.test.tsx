import { fireEvent, render, screen } from '@testing-library/react';

import { StudentPagination } from '@/components/Students/StudentPagination';

function renderPagination(page: number, totalPages: number, total = totalPages * 50): jest.Mock {
  const onPageChange = jest.fn();
  render(
    <StudentPagination
      page={page}
      totalPages={totalPages}
      total={total}
      limit={50}
      onPageChange={onPageChange}
    />,
  );
  return onPageChange;
}

describe('StudentPagination', () => {
  it('mostra a página atual e o intervalo de registros', () => {
    renderPagination(2, 60, 3000);

    expect(screen.getByText(/página 2 de 60/i)).toBeInTheDocument();
    expect(screen.getByText(/mostrando 51–100 de 3\.000/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('navega pelo número da página', () => {
    const onPageChange = renderPagination(1, 5);

    fireEvent.click(screen.getByRole('button', { name: 'Página 3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('anterior e próxima mudam a página', () => {
    const onPageChange = renderPagination(3, 5);

    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    fireEvent.click(screen.getByRole('button', { name: /próxima/i }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 2);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 4);
  });

  it('desabilita anterior na primeira e próxima na última', () => {
    renderPagination(1, 1, 3);

    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /próxima/i })).toBeDisabled();
    expect(screen.getByText(/mostrando 1–3 de 3/i)).toBeInTheDocument();
  });

  it('resume páginas distantes com reticências', () => {
    renderPagination(30, 60, 3000);

    for (const n of [1, 29, 30, 31, 60]) {
      expect(screen.getByRole('button', { name: `Página ${n}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Página 2' })).not.toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(2);
  });
});
