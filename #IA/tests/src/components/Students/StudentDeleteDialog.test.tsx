import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { StudentDeleteDialog } from '@/components/Students/StudentDeleteDialog';
import type { StudentDeleteDialogProps } from '@/components/Students/StudentDeleteDialog';

import { makeStudent } from './studentFixtures';

function renderDialog(props: Partial<StudentDeleteDialogProps> = {}) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const utils = render(
    <StudentDeleteDialog
      student={makeStudent()}
      isDeleting={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { ...utils, onConfirm, onCancel };
}

describe('StudentDeleteDialog', () => {
  it('pede confirmação citando o aluno', () => {
    const { onConfirm, onCancel } = renderDialog();

    expect(screen.getByRole('dialog', { name: /excluir aluno/i })).toHaveTextContent('João Silva');

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^excluir$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('abre com o foco em Cancelar', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /cancelar/i })).toHaveFocus();
  });

  it('fecha com Esc', () => {
    const { onCancel } = renderDialog();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fecha com Esc mesmo com o foco fora do dialog (ex.: depois de um 403)', () => {
    const { onCancel } = renderDialog({ error: 'Você não tem permissão para excluir alunos.' });

    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('não fecha com Esc durante a exclusão', () => {
    const { onCancel } = renderDialog({ isDeleting: true });

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('prende o Tab dentro do dialog', () => {
    renderDialog();
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    const confirm = screen.getByRole('button', { name: /^excluir$/i });

    confirm.focus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();

    // Foco escapou (ex.: clique fora): o Tab o traz de volta.
    confirm.blur();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(cancel).toHaveFocus();
  });

  it('bloqueia as ações durante a exclusão sem tirar o foco do botão', () => {
    const { rerender, onConfirm, onCancel } = renderDialog();
    screen.getByRole('button', { name: /^excluir$/i }).focus();

    rerender(
      <StudentDeleteDialog
        student={makeStudent()}
        isDeleting
        error={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const busy = screen.getByRole('button', { name: /excluindo/i });
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    expect(busy).toHaveFocus();
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    expect(cancel).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(busy);
    fireEvent.click(cancel);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('mostra o erro', () => {
    renderDialog({ error: 'Você não tem permissão para excluir alunos.' });
    expect(screen.getByRole('alert')).toHaveTextContent(/permissão/i);
  });

  it('devolve o foco a quem abriu ao fechar', () => {
    function Harness(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir
          </button>
          {open ? (
            <StudentDeleteDialog
              student={makeStudent()}
              isDeleting={false}
              onConfirm={() => undefined}
              onCancel={() => setOpen(false)}
            />
          ) : null}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('button', { name: /cancelar/i })).toHaveFocus();

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
