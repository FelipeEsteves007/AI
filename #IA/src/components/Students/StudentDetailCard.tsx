import { useId } from 'react';
import type { ReactNode } from 'react';

export interface StudentDetailCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  /** Ação no cabeçalho do card (ex.: "+ Adicionar curso"). */
  action?: ReactNode;
}

/** Moldura dos cards do detalhe: `section` rotulada pelo título (vira landmark `region`). */
export function StudentDetailCard({
  title,
  children,
  className = '',
  action,
}: StudentDetailCardProps): JSX.Element {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function StudentEmptyText({ children }: { children: ReactNode }): JSX.Element {
  return <p className="text-sm text-gray-500">{children}</p>;
}
