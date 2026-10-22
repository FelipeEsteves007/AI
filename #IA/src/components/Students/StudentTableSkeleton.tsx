export interface StudentTableSkeletonProps {
  rows?: number;
}

/** Placeholder da listagem enquanto a primeira resposta não chega. */
export function StudentTableSkeleton({ rows = 8 }: StudentTableSkeletonProps): JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
    >
      <span className="sr-only">Carregando alunos…</span>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} data-skeleton-row className="flex animate-pulse items-center gap-4">
            <div className="h-4 w-1/4 rounded bg-gray-200" />
            <div className="hidden h-4 w-1/3 rounded bg-gray-200 md:block" />
            <div className="hidden h-4 w-1/6 rounded bg-gray-200 md:block" />
            <div className="ml-auto h-5 w-16 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
