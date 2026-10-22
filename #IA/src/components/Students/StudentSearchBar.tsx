import { useEffect, useRef, useState } from 'react';

export const SEARCH_DEBOUNCE_MS = 300;
/** Mesmo limite do backend para `search` (refinamentos após a TASK-007); acima dele, 400. */
export const SEARCH_MAX_LENGTH = 255;

export interface StudentSearchBarProps {
  /** Termo já aplicado à listagem. Mudança externa (ex.: limpar filtros) reescreve o campo. */
  value: string;
  /** Chamado com o termo aparado, só depois de `delayMs` sem digitação. */
  onSearchChange: (search: string) => void;
  delayMs?: number;
}

/** Campo de busca por nome ou e-mail com debounce: não dispara uma requisição por tecla. */
export function StudentSearchBar({
  value,
  onSearchChange,
  delayMs = SEARCH_DEBOUNCE_MS,
}: StudentSearchBarProps): JSX.Element {
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Último termo emitido: quando o pai o devolve em `value`, é eco e não reescreve o campo. */
  const emittedRef = useRef<string | null>(null);

  function cancelPending(): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (value === emittedRef.current) {
      emittedRef.current = null;
      return;
    }
    emittedRef.current = null;
    cancelPending();
    setText(value);
  }, [value]);

  useEffect(() => cancelPending, []);

  function handleChange(typed: string): void {
    // O `maxLength` do input cobre a digitação; o corte cobre valores atribuídos por script.
    const next = typed.slice(0, SEARCH_MAX_LENGTH);
    setText(next);
    cancelPending();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const term = next.trim();
      if (term !== value) {
        emittedRef.current = term;
        onSearchChange(term);
      }
    }, delayMs);
  }

  return (
    <div className="relative w-full sm:max-w-sm">
      <label htmlFor="student-search" className="sr-only">
        Buscar por nome ou e-mail
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 3.47 9.77l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <input
        id="student-search"
        type="search"
        value={text}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Buscar por nome ou e-mail"
        maxLength={SEARCH_MAX_LENGTH}
        autoComplete="off"
        className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
      />
    </div>
  );
}
