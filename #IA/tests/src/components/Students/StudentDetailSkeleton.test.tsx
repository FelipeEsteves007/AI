import { render, screen } from '@testing-library/react';

import { StudentDetailSkeleton } from '@/components/Students/StudentDetailSkeleton';

describe('StudentDetailSkeleton', () => {
  it('anuncia o carregamento', () => {
    render(<StudentDetailSkeleton />);
    expect(screen.getByRole('status')).toHaveTextContent(/carregando aluno/i);
  });
});
