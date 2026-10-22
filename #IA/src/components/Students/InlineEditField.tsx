import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface InlineEditOption {
  value: string;
  label: string;
}

export interface InlineEditFieldProps {
  id: string;
  label: string;
  /** Valor atual, já confirmado pelo servidor. */
  value: string;
  /** Como exibir o valor fora da edição (ex.: CPF com máscara, badge de status). */
  display?: ReactNode;
  /** Texto quando `value` está vazio. */
  emptyText?: string;
  kind?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  options?: readonly InlineEditOption[];
  /**
   * Salva o valor aparado. Devolve `null` em sucesso ou a mensagem de erro — nesse caso a exibição
   * volta ao `value` anterior e mostra a mensagem; o texto digitado fica guardado e volta ao campo
   * na próxima edição, para corrigir sem redigitar.
   */
  onSave: (next: string) => Promise<string | null>;
  /** Cada incremento abre a edição com o foco no campo (botão "Editar" da página). */
  editRequest?: number;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric';
  autoComplete?: string;
  /** Rótulo só para leitores de tela, quando o título do card já diz o que é o campo. */
  hideLabel?: boolean;
}

const INPUT_CLASS =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 aria-[invalid=true]:border-red-500';

/**
 * Campo com edição inline: salva ao sair do campo (blur) ou com Enter (Ctrl+Enter no textarea),
 * Esc cancela. Sem mudança, não chama `onSave`.
 */
export function InlineEditField({
  id,
  label,
  value,
  display,
  emptyText = 'Não informado',
  kind = 'text',
  options = [],
  onSave,
  editRequest = 0,
  inputMode,
  autoComplete = 'off',
  hideLabel = false,
}: InlineEditFieldProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Texto do salvamento que falhou; reabre a edição com ele. */
  const failedDraftRef = useRef<string | null>(null);

  // Refs síncronas: o blur que acompanha Enter/Esc não pode salvar de novo.
  const editingRef = useRef(false);
  const mountedRef = useRef(true);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const focusEditButtonRef = useRef(false);
  const lastEditRequestRef = useRef(editRequest);

  const errorId = `${id}-error`;
  const labelClass = hideLabel ? 'sr-only' : 'block text-xs font-medium uppercase text-gray-500';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function startEditing(): void {
    editingRef.current = true;
    setDraft(failedDraftRef.current ?? value);
    setIsEditing(true);
  }

  useEffect(() => {
    if (editRequest !== lastEditRequestRef.current) {
      lastEditRequestRef.current = editRequest;
      if (!editingRef.current) {
        startEditing();
      } else {
        fieldRef.current?.focus();
      }
    }
    // `startEditing` lê o `value` do render atual; só o pedido novo importa aqui.
  }, [editRequest]);

  useEffect(() => {
    if (isEditing) {
      fieldRef.current?.focus();
    } else if (focusEditButtonRef.current) {
      focusEditButtonRef.current = false;
      editButtonRef.current?.focus();
    }
  }, [isEditing]);

  /** Descarta a mensagem de erro e o texto que falhou. */
  function clearFailure(): void {
    failedDraftRef.current = null;
    setError(null);
  }

  function stopEditing(returnFocus: boolean): void {
    editingRef.current = false;
    focusEditButtonRef.current = returnFocus;
    setIsEditing(false);
  }

  async function commit(returnFocus: boolean): Promise<void> {
    if (!editingRef.current) {
      return;
    }
    const next = draft.trim();
    if (next === value.trim()) {
      clearFailure();
      stopEditing(returnFocus);
      return;
    }
    editingRef.current = false;
    setIsSaving(true);
    const message = await onSave(next);
    if (!mountedRef.current) {
      return;
    }
    setIsSaving(false);
    failedDraftRef.current = message === null ? null : next;
    setError(message);
    stopEditing(returnFocus);
  }

  function cancel(): void {
    if (!editingRef.current) {
      return;
    }
    clearFailure();
    setDraft(value);
    stopEditing(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }
    if (event.key !== 'Enter') {
      return;
    }
    if (kind === 'textarea' && !(event.ctrlKey || event.metaKey)) {
      return;
    }
    event.preventDefault();
    void commit(true);
  }

  const shared = {
    id,
    ref: fieldRef,
    onBlur: () => {
      void commit(false);
    },
    onKeyDown: handleKeyDown,
    disabled: isSaving,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
    className: INPUT_CLASS,
  } as const;

  function renderField(): JSX.Element {
    if (kind === 'select') {
      return (
        <select {...shared} value={draft} onChange={(event) => setDraft(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }
    if (kind === 'textarea') {
      return (
        <textarea
          {...shared}
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      );
    }
    return (
      <input
        {...shared}
        type={kind}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    );
  }

  const shown = value ? (display ?? value) : <span className="text-gray-400">{emptyText}</span>;

  return (
    <div className="py-2">
      {isEditing || isSaving ? (
        <div>
          <label htmlFor={id} className={labelClass}>
            {label}
          </label>
          <div className={hideLabel ? undefined : 'mt-1'}>{renderField()}</div>
          {isSaving ? (
            <p role="status" className="mt-1 text-xs text-gray-500">
              Salvando…
            </p>
          ) : kind === 'textarea' ? (
            <p className="mt-1 text-xs text-gray-400">Ctrl+Enter salva · Esc cancela</p>
          ) : null}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={labelClass}>{label}</span>
            <div
              className={`mt-1 break-words text-sm text-gray-900 ${kind === 'textarea' ? 'whitespace-pre-line' : ''}`}
            >
              {shown}
            </div>
          </div>
          <button
            ref={editButtonRef}
            type="button"
            onClick={startEditing}
            aria-label={`Editar ${label.toLowerCase()}`}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M13.586 3.586a2 2 0 1 1 2.828 2.828l-.793.793-2.828-2.828.793-.793ZM11.379 5.793 3 14.172V17h2.828l8.38-8.379-2.83-2.828Z" />
            </svg>
          </button>
        </div>
      )}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
