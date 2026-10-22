import { fireEvent, render, screen, within } from '@testing-library/react';

import { StudentTable } from '@/components/Students/StudentTable';
import type { StudentTableProps } from '@/components/Students/StudentTable';

import { makeStudent } from './studentFixtures';

const joao = makeStudent();
const ana = makeStudent({
  id: 's-2',
  name: 'Ana Lima',
  email: 'ana@email.com',
  phone: null,
  cpf: null,
  status: 'pausado',
  assignedTo: null,
  assignedToName: null,
});

function renderTable(overrides: Partial<StudentTableProps> = {}): StudentTableProps {
  const props: StudentTableProps = {
    students: [joao, ana],
    sortBy: 'createdAt',
    order: 'desc',
    onSortChange: jest.fn(),
    onOpen: jest.fn(),
    onEdit: jest.fn(),
    ...overrides,
  };
  render(<StudentTable {...props} />);
  return props;
}

const table = (): HTMLElement => screen.getByRole('table');
const cards = (): HTMLElement => screen.getByRole('list', { name: /alunos/i });

describe('StudentTable', () => {
  it('renderiza os alunos na tabela com os dados formatados', () => {
    renderTable();

    const row = within(table()).getByRole('row', { name: /joão silva/i });
    expect(row).toHaveTextContent('joao@email.com');
    expect(row).toHaveTextContent('(11) 98765-4321');
    expect(row).toHaveTextContent('123.456.789-09');
    expect(row).toHaveTextContent('Ativo');
    expect(row).toHaveTextContent('Bob Vendedor');
    expect(row).toHaveTextContent('01/09/2026');

    expect(within(table()).getByRole('row', { name: /ana lima/i })).toHaveTextContent('Pausado');
  });

  it('alinha o nome à esquerda como as demais colunas (o <th> de linha centraliza por padrão)', () => {
    renderTable();
    const table = screen.getByRole('table');

    for (const name of ['João Silva', 'Ana Lima']) {
      expect(within(table).getByRole('rowheader', { name })).toHaveClass('text-left');
    }
  });

  it('renderiza os mesmos alunos como cards para o mobile', () => {
    renderTable();

    const items = within(cards()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('João Silva');
    expect(items[1]).toHaveTextContent('Ana Lima');
  });

  it('abre o aluno ao clicar na linha', () => {
    const { onOpen } = renderTable();

    fireEvent.click(within(table()).getByRole('row', { name: /ana lima/i }));

    expect(onOpen).toHaveBeenCalledWith(ana);
  });

  it('abre o aluno com Enter na linha (teclado)', () => {
    const { onOpen } = renderTable();

    fireEvent.keyDown(within(table()).getByRole('row', { name: /joão silva/i }), { key: 'Enter' });

    expect(onOpen).toHaveBeenCalledWith(joao);
  });

  it('abre o aluno ao tocar no card', () => {
    const { onOpen } = renderTable();

    fireEvent.click(within(cards()).getByRole('button', { name: /abrir joão silva/i }));

    expect(onOpen).toHaveBeenCalledWith(joao);
  });

  it('Ver e Editar chamam os callbacks sem disparar o clique da linha', () => {
    const { onOpen, onEdit } = renderTable();
    const row = within(table()).getByRole('row', { name: /joão silva/i });

    fireEvent.click(within(row).getByRole('button', { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith(joao);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole('button', { name: /^ver/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('não mostra Excluir sem onDelete', () => {
    renderTable();

    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('mostra Excluir com onDelete, sem abrir a linha', () => {
    const onDelete = jest.fn();
    const { onOpen } = renderTable({ onDelete });
    const row = within(table()).getByRole('row', { name: /ana lima/i });

    fireEvent.click(within(row).getByRole('button', { name: /excluir/i }));

    expect(onDelete).toHaveBeenCalledWith(ana);
    expect(onOpen).not.toHaveBeenCalled();
    expect(within(cards()).getAllByRole('button', { name: /excluir/i })).toHaveLength(2);
  });

  it('marca a coluna ordenada com aria-sort', () => {
    renderTable({ sortBy: 'name', order: 'asc' });

    expect(within(table()).getByRole('columnheader', { name: /nome/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(table()).getByRole('columnheader', { name: /status/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );
  });

  it.each([
    [/nome/i, 'name'],
    [/status/i, 'status'],
    [/cadastro/i, 'createdAt'],
  ])('clique no cabeçalho %s pede ordenação por %s', (label, sortBy) => {
    const { onSortChange } = renderTable();

    fireEvent.click(within(table()).getByRole('button', { name: label }));

    expect(onSortChange).toHaveBeenCalledWith(sortBy);
  });
});
