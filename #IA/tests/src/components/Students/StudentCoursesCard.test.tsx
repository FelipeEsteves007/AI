import { fireEvent, render, screen, within } from '@testing-library/react';

import { StudentCoursesCard } from '@/components/Students/StudentCoursesCard';

import { makeStudentDetail } from './studentFixtures';

const detail = makeStudentDetail();

describe('StudentCoursesCard', () => {
  it('lista nome, data da compra e valor em reais', () => {
    render(<StudentCoursesCard courses={detail.courses} />);

    const card = screen.getByRole('region', { name: 'Cursos comprados' });
    const items = within(card).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Delphi Avançado');
    expect(items[0]).toHaveTextContent('10/09/2026');
    expect(items[1]).toHaveTextContent(/R\$\s297,50/);
  });

  it('estado vazio', () => {
    render(<StudentCoursesCard courses={[]} />);
    expect(screen.getByText('Nenhum curso comprado ainda.')).toBeInTheDocument();
  });

  it('"+ Adicionar curso" só aparece com onAdd, e chama ao clicar', () => {
    const onAdd = jest.fn();
    const { rerender } = render(<StudentCoursesCard courses={[]} />);
    expect(screen.queryByRole('button', { name: '+ Adicionar curso' })).not.toBeInTheDocument();

    rerender(<StudentCoursesCard courses={[]} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar curso' }));

    expect(onAdd).toHaveBeenCalled();
  });
});
