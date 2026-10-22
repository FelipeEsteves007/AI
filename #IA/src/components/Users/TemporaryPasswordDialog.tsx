import { useEffect, useRef, useState } from 'react';

export interface TemporaryPasswordDialogProps {
  userName: string;
  /** Senha em texto puro; vive só no estado de quem abriu o diálogo. */
  password: string;
  onClose: () => void;
}

/**
 * RN-04: a senha provisória aparece **uma única vez**, logo depois da criação ou da
 * redefinição. O componente não guarda a senha em lugar nenhum (nada de `localStorage`,
 * nada de cache): ela vem por prop e some quando a página zera o estado no `onClose`.
 */
export function TemporaryPasswordDialog({
  userName,
  password,
  onClose,
}: TemporaryPasswordDialogProps): JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="temporary-password-title"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="temporary-password-title" className="text-xl font-semibold text-gray-900">
          Senha provisória
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          Senha provisória de <strong>{userName}</strong>. Ela precisa ser trocada no primeiro
          acesso.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm text-gray-900">{password}</code>
          <button
            type="button"
            onClick={() => {
              void handleCopy();
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Copiar
          </button>
        </div>
        <p aria-live="polite" className="mt-1 h-4 text-xs text-emerald-700">
          {copied ? 'Senha copiada.' : ''}
        </p>

        <p
          role="alert"
          className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          Anote ou copie agora: esta senha não poderá ser vista de novo. Se ela se perder, use
          &quot;Redefinir senha&quot; para gerar outra.
        </p>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
