import { act, fireEvent, render, screen } from '@testing-library/react';

import { InlineEditField } from '@/components/Students/InlineEditField';
import type { InlineEditFieldProps } from '@/components/Students/InlineEditField';

function setup(props: Partial<InlineEditFieldProps> = {}) {
  const onSave = jest.fn<Promise<string | null>, [string]>().mockResolvedValue(null);
  const utils = render(
    <InlineEditField id="student-email" label="E-mail" value="joao@email.com" onSave={onSave} {...props} />,
  );
  return { ...utils, onSave: (props.onSave as typeof onSave | undefined) ?? onSave };
}

function startEditing(label = 'E-mail'): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: `Editar ${label.toLowerCase()}` }));
  return screen.getByRole('textbox', { name: label });
}

describe('InlineEditField', () => {
  it('mostra o valor e entra em edição com o foco no campo', () => {
    setup();

    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    const input = startEditing();
    expect(input).toHaveFocus();
    expect(input).toHaveValue('joao@email.com');
  });

  it('mostra o texto de vazio sem valor', () => {
    setup({ value: '', emptyText: 'Não informado' });
    expect(screen.getByText('Não informado')).toBeInTheDocument();
  });

  it('salva ao sair do campo com o valor aparado', async () => {
    const { onSave } = setup();
    const input = startEditing();

    fireEvent.change(input, { target: { value: '  novo@email.com ' } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('novo@email.com');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('não salva quando o valor não mudou', async () => {
    const { onSave } = setup();
    const input = startEditing();

    fireEvent.change(input, { target: { value: 'joao@email.com  ' } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Enter salva uma única vez e devolve o foco ao botão de editar', async () => {
    const { onSave } = setup();
    const input = startEditing();

    fireEvent.change(input, { target: { value: 'novo@email.com' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Editar e-mail' })).toHaveFocus();
  });

  it('Esc cancela sem salvar e mantém o valor anterior', async () => {
    const { onSave } = setup();
    const input = startEditing();

    fireEvent.change(input, { target: { value: 'outro@email.com' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.blur(input);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar e-mail' })).toHaveFocus();
  });

  it('em erro volta ao valor anterior e mostra a mensagem junto do campo', async () => {
    const onSave = jest.fn().mockResolvedValue('E-mail já cadastrado em outro aluno');
    setup({ onSave });
    const input = startEditing();

    fireEvent.change(input, { target: { value: 'ana@email.com' } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(screen.getByText('joao@email.com')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail já cadastrado em outro aluno');

    // Voltar a editar mantém a mensagem ligada ao campo até o próximo salvamento.
    const again = startEditing();
    expect(again).toHaveAccessibleDescription('E-mail já cadastrado em outro aluno');
    expect(again).toHaveAttribute('aria-invalid', 'true');
  });

  /*
   * Escolha documentada: quando o salvamento falha, a exibição volta ao valor confirmado pelo
   * servidor (a tela nunca mostra um dado que não está gravado), mas o texto que o usuário digitou
   * fica guardado. Ao reabrir a edição, o campo começa com esse texto, para corrigir só o que deu
   * errado sem redigitar tudo. Esc, sair sem mudar ou um salvamento bem-sucedido descartam o
   * rascunho e a mensagem.
   */
  describe('depois de uma falha ao salvar', () => {
    async function failSave(typed = 'ana@email.com') {
      const onSave = jest
        .fn<Promise<string | null>, [string]>()
        .mockResolvedValueOnce('E-mail já cadastrado em outro aluno')
        .mockResolvedValue(null);
      setup({ onSave });
      const input = startEditing();
      fireEvent.change(input, { target: { value: typed } });
      await act(async () => {
        fireEvent.blur(input);
      });
      return onSave;
    }

    it('reabrir a edição traz o texto digitado para corrigir', async () => {
      await failSave('ana@email.com');

      expect(screen.getByText('joao@email.com')).toBeInTheDocument();
      expect(startEditing()).toHaveValue('ana@email.com');
    });

    it('Esc descarta a mensagem e o texto digitado', async () => {
      await failSave();

      const again = startEditing();
      await act(async () => {
        fireEvent.keyDown(again, { key: 'Escape' });
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const fresh = startEditing();
      expect(fresh).toHaveValue('joao@email.com');
      expect(fresh).not.toHaveAttribute('aria-invalid');
    });

    it('sair sem mudar em relação ao valor salvo descarta a mensagem', async () => {
      const onSave = await failSave();

      const again = startEditing();
      fireEvent.change(again, { target: { value: 'joao@email.com' } });
      await act(async () => {
        fireEvent.blur(again);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(startEditing()).toHaveValue('joao@email.com');
    });

    it('salvar com sucesso limpa a mensagem e o rascunho', async () => {
      const onSave = await failSave();

      const again = startEditing();
      fireEvent.change(again, { target: { value: 'ana.lima@email.com' } });
      await act(async () => {
        fireEvent.blur(again);
      });

      expect(onSave).toHaveBeenLastCalledWith('ana.lima@email.com');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(startEditing()).toHaveValue('joao@email.com');
    });
  });

  it('mostra que está salvando enquanto espera a resposta', async () => {
    let finish: (value: string | null) => void = () => undefined;
    const onSave = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          finish = resolve;
        }),
    );
    setup({ onSave });
    const input = startEditing();

    fireEvent.change(input, { target: { value: 'novo@email.com' } });
    fireEvent.blur(input);

    expect(screen.getByRole('status')).toHaveTextContent(/salvando/i);
    await act(async () => finish(null));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('entra em edição quando o pai pede (botão Editar da página)', () => {
    const { rerender, onSave } = setup({ editRequest: 0 });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    rerender(
      <InlineEditField
        id="student-email"
        label="E-mail"
        value="joao@email.com"
        onSave={onSave}
        editRequest={1}
      />,
    );

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveFocus();
  });

  it('hideLabel esconde o rótulo visualmente sem tirar o nome acessível', () => {
    setup({ hideLabel: true });

    expect(screen.getByText('E-mail')).toHaveClass('sr-only');
    const input = startEditing();
    expect(input).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toHaveClass('sr-only');
  });

  it('select salva a opção escolhida ao sair do campo', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    render(
      <InlineEditField
        id="student-status"
        label="Status"
        kind="select"
        value="ativo"
        display={<span>Ativo</span>}
        options={[
          { value: 'ativo', label: 'Ativo' },
          { value: 'pausado', label: 'Pausado' },
        ]}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar status' }));
    const select = screen.getByRole('combobox', { name: 'Status' });
    fireEvent.change(select, { target: { value: 'pausado' } });
    await act(async () => {
      fireEvent.blur(select);
    });

    expect(onSave).toHaveBeenCalledWith('pausado');
  });

  it('textarea: Enter quebra linha, Ctrl+Enter salva sem aparar o meio do texto', async () => {
    const onSave = jest.fn().mockResolvedValue(null);
    render(
      <InlineEditField id="student-notes" label="Anotações" kind="textarea" value="" onSave={onSave} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar anotações' }));
    const textarea = screen.getByRole('textbox', { name: 'Anotações' });
    fireEvent.change(textarea, { target: { value: 'linha 1\nlinha 2\n' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    });
    expect(onSave).toHaveBeenCalledWith('linha 1\nlinha 2');
  });
});
