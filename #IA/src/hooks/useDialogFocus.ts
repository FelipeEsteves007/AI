import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface UseDialogFocusOptions {
  /** Chamado com Esc, esteja o foco onde estiver. */
  onEscape: () => void;
  /** Elemento que recebe o foco ao abrir; sem ele, o primeiro focável do dialog. */
  initialFocusRef?: RefObject<HTMLElement>;
  /**
   * Recebe o foco ao fechar quando quem abriu já não está no DOM (ex.: a linha excluída sumiu da
   * lista). Sem ele, nesse caso o foco cairia no `body`. Precisa ser focável (`tabIndex={-1}`).
   */
  returnFocusFallbackRef?: RefObject<HTMLElement>;
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute('disabled'),
  );
}

/**
 * Foco de um dialog modal: foco inicial, Tab preso dentro dele, Esc ouvido em `document`
 * enquanto montado (funciona mesmo com o foco fora) e devolução do foco a quem abriu.
 */
export function useDialogFocus<T extends HTMLElement>({
  onEscape,
  initialFocusRef,
  returnFocusFallbackRef,
}: UseDialogFocusOptions): RefObject<T> {
  const dialogRef = useRef<T>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const fallbackRef = useRef(returnFocusFallbackRef);
  fallbackRef.current = returnFocusFallbackRef;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const initial = initialFocusRef?.current ?? (dialog ? focusableIn(dialog)[0] : undefined);
    initial?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onEscapeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }
      const items = focusableIn(dialogRef.current);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && dialogRef.current.contains(active);

      if (!inside) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // No desmonte o DOM já foi atualizado: se quem abriu saiu junto, vale o alvo de reserva.
      if (opener && opener.isConnected) {
        opener.focus();
      } else {
        fallbackRef.current?.current?.focus();
      }
    };
    // Só na montagem: o foco inicial e o de retorno não mudam enquanto o dialog vive.
  }, []);

  return dialogRef;
}
