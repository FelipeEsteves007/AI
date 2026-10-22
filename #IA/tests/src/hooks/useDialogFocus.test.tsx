import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { useDialogFocus } from '@/hooks/useDialogFocus';

interface DialogProps {
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusFallbackRef?: RefObject<HTMLElement>;
  children?: ReactNode;
}

function Dialog({
  onEscape = () => undefined,
  initialFocusRef,
  returnFocusFallbackRef,
  children,
}: DialogProps): JSX.Element {
  const ref = useDialogFocus<HTMLDivElement>({ onEscape, initialFocusRef, returnFocusFallbackRef });
  return (
    <div ref={ref} role="dialog" aria-label="Teste">
      {children ?? (
        <>
          <button type="button">Primeiro</button>
          <button type="button" disabled>
            Desabilitado
          </button>
          <input aria-label="Meio" />
          <button type="button">Último</button>
        </>
      )}
    </div>
  );
}

function tab(shiftKey = false): boolean {
  return fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey });
}

describe('useDialogFocus', () => {
  it('foca o primeiro elemento focável ao abrir', () => {
    render(<Dialog />);

    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('foca o initialFocusRef quando informado', () => {
    function WithInitial(): JSX.Element {
      const lastRef = useRef<HTMLButtonElement>(null);
      return (
        <Dialog initialFocusRef={lastRef}>
          <button type="button">Primeiro</button>
          <button ref={lastRef} type="button">
            Cancelar
          </button>
        </Dialog>
      );
    }
    render(<WithInitial />);

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('Tab no último volta ao primeiro e Shift+Tab no primeiro vai ao último, pulando desabilitados', () => {
    render(<Dialog />);
    const first = screen.getByRole('button', { name: 'Primeiro' });
    const last = screen.getByRole('button', { name: 'Último' });

    expect(tab(true)).toBe(false);
    expect(last).toHaveFocus();

    expect(tab()).toBe(false);
    expect(first).toHaveFocus();
  });

  it('Tab no meio do dialog segue o fluxo natural do navegador', () => {
    render(<Dialog />);
    screen.getByRole('textbox', { name: 'Meio' }).focus();

    // Sem preventDefault: quem move o foco é o navegador.
    expect(tab()).toBe(true);
    expect(tab(true)).toBe(true);
  });

  it('Tab com o foco fora do dialog traz o foco para dentro', () => {
    render(
      <>
        <button type="button">Fora</button>
        <Dialog />
      </>,
    );
    screen.getByRole('button', { name: 'Fora' }).focus();

    expect(tab()).toBe(false);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    screen.getByRole('button', { name: 'Fora' }).focus();
    expect(tab(true)).toBe(false);
    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });

  it('sem elementos focáveis, Tab é bloqueado e o foco não escapa', () => {
    render(
      <>
        <button type="button">Fora</button>
        <Dialog>
          <p>Só texto</p>
        </Dialog>
      </>,
    );
    const outside = screen.getByRole('button', { name: 'Fora' });
    outside.focus();

    expect(tab()).toBe(false);
    expect(tab(true)).toBe(false);
    expect(outside).toHaveFocus();
  });

  it('Esc chama a versão mais recente do onEscape, com o foco em qualquer lugar', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(<Dialog onEscape={first} />);
    rerender(<Dialog onEscape={second} />);

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('para de ouvir o teclado ao desmontar', () => {
    const onEscape = jest.fn();
    const { unmount } = render(<Dialog onEscape={onEscape} />);

    unmount();
    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(onEscape).not.toHaveBeenCalled();
  });

  describe('devolução do foco ao fechar', () => {
    function Page({ removeOpenerOnClose = false }: { removeOpenerOnClose?: boolean }): JSX.Element {
      const [open, setOpen] = useState(false);
      const [openerVisible, setOpenerVisible] = useState(true);
      const headingRef = useRef<HTMLHeadingElement>(null);
      return (
        <>
          <h1 ref={headingRef} tabIndex={-1}>
            Alunos
          </h1>
          {openerVisible ? (
            <button type="button" onClick={() => setOpen(true)}>
              Abrir
            </button>
          ) : null}
          {open ? (
            <Dialog returnFocusFallbackRef={headingRef}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (removeOpenerOnClose) setOpenerVisible(false);
                }}
              >
                Fechar
              </button>
            </Dialog>
          ) : null}
        </>
      );
    }

    function openAndClose(): void {
      const opener = screen.getByRole('button', { name: 'Abrir' });
      opener.focus();
      fireEvent.click(opener);
      expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    }

    it('devolve o foco a quem abriu', () => {
      render(<Page />);

      openAndClose();

      expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus();
    });

    it('usa o alvo de reserva quando quem abriu saiu do DOM', () => {
      render(<Page removeOpenerOnClose />);

      openAndClose();

      expect(screen.queryByRole('button', { name: 'Abrir' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Alunos' })).toHaveFocus();
    });

    it('sem alvo de reserva e sem quem abriu, não tenta focar nada', () => {
      function NoFallback(): JSX.Element {
        const [open, setOpen] = useState(true);
        return open ? (
          <Dialog>
            <button type="button" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </Dialog>
        ) : (
          <p>fechado</p>
        );
      }
      render(<NoFallback />);

      expect(() => fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))).not.toThrow();
      expect(screen.getByText('fechado')).toBeInTheDocument();
    });
  });
});
