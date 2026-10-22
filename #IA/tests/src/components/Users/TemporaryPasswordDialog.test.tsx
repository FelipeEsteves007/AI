import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { TemporaryPasswordDialog } from '@/components/Users/TemporaryPasswordDialog';

const onClose = jest.fn();

beforeEach(() => {
  onClose.mockReset();
});

describe('TemporaryPasswordDialog', () => {
  it('mostra a senha provisória e avisa que ela não será exibida de novo', () => {
    render(
      <TemporaryPasswordDialog userName="Ada Lovelace" password="Prov1234" onClose={onClose} />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Prov1234')).toBeInTheDocument();
    expect(screen.getByText(/ada lovelace/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/não poderá ser vista de novo/i);
  });

  it('copia a senha para a área de transferência', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(
      <TemporaryPasswordDialog userName="Ada Lovelace" password="Prov1234" onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /copiar/i }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Prov1234'));
    expect(await screen.findByText(/senha copiada/i)).toBeInTheDocument();
  });

  it('avisa quem fechou o diálogo', () => {
    render(
      <TemporaryPasswordDialog userName="Ada Lovelace" password="Prov1234" onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /entendi/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
