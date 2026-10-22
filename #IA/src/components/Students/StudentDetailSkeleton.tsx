/** Placeholder do detalhe enquanto o aluno não chega. */
export function StudentDetailSkeleton(): JSX.Element {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Carregando aluno…</span>
      <div className="h-7 w-1/3 rounded bg-gray-200" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-9 w-28 rounded-md bg-gray-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
