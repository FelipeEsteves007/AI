import { render, screen } from '@testing-library/react';

import { StudentTableSkeleton } from '@/components/Students/StudentTableSkeleton';

describe('StudentTableSkeleton', () => {
  it('anuncia o carregamento de forma acessível', () => {
    render(<StudentTableSkeleton rows={4} />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(/carregando alunos/i);
    expect(status.querySelectorAll('[data-skeleton-row]')).toHaveLength(4);
  });
});
