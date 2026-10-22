import { render, screen, within } from '@testing-library/react';

import { StudentLeadsCard } from '@/components/Students/StudentLeadsCard';

import { makeStudentDetail } from './studentFixtures';

const detail = makeStudentDetail();

describe('StudentLeadsCard', () => {
  it('lista status e valor, com "Sem valor" quando nulo', () => {
    render(<StudentLeadsCard leads={detail.pipelineLeads} />);

    const card = screen.getByRole('region', { name: 'Oportunidades' });
    const items = within(card).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Negociação');
    expect(items[0]).toHaveTextContent(/R\$\s750,00/);
    expect(items[1]).toHaveTextContent('Prospecção');
    expect(items[1]).toHaveTextContent('Sem valor');
  });

  it('estado vazio', () => {
    render(<StudentLeadsCard leads={[]} />);
    expect(screen.getByText('Nenhuma oportunidade para este aluno.')).toBeInTheDocument();
  });
});
