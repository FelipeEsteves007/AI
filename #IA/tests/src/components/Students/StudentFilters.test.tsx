import { fireEvent, render, screen } from '@testing-library/react';

import { StudentFilters } from '@/components/Students/StudentFilters';
import type { StudentFiltersProps } from '@/components/Students/StudentFilters';

const sellers = [
  { id: 'u-2', name: 'Bob Vendedor' },
  { id: 'u-3', name: 'Carol Vendas' },
];

function renderFilters(overrides: Partial<StudentFiltersProps> = {}): StudentFiltersProps {
  const props: StudentFiltersProps = {
    status: '',
    assignedTo: '',
    sellers: null,
    hasActiveFilters: false,
    onStatusChange: jest.fn(),
    onAssignedToChange: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  render(<StudentFilters {...props} />);
  return props;
}

describe('StudentFilters', () => {
  it('oferece os três status e avisa a mudança', () => {
    const props = renderFilters();

    expect(screen.getByRole('option', { name: 'Ativo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inativo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pausado' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'pausado' } });
    expect(props.onStatusChange).toHaveBeenCalledWith('pausado');
  });

  it('não mostra o filtro de vendedor sem lista de vendedores', () => {
    renderFilters({ sellers: null });

    expect(screen.queryByLabelText(/vendedor/i)).not.toBeInTheDocument();
  });

  it('mostra o filtro de vendedor quando recebe a lista', () => {
    const props = renderFilters({ sellers });

    expect(screen.getByRole('option', { name: 'Carol Vendas' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/vendedor/i), { target: { value: 'u-3' } });

    expect(props.onAssignedToChange).toHaveBeenCalledWith('u-3');
  });

  it('não tem filtro de curso nesta sprint (S6-7)', () => {
    renderFilters({ sellers });

    expect(screen.queryByLabelText(/curso/i)).not.toBeInTheDocument();
  });

  it('oferece "Limpar filtros" quando há filtro ativo', () => {
    const { onClear } = renderFilters({ hasActiveFilters: true });

    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('esconde "Limpar filtros" sem filtro ativo', () => {
    renderFilters({ hasActiveFilters: false });

    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
  });
});
