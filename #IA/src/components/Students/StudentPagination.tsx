import { formatCount } from '@/components/Students/studentFormat';

export interface StudentPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | 'gap';

/** Até esta quantidade, todas as páginas aparecem. */
const SHOW_ALL_UP_TO = 7;

/** Primeira, última, a atual e suas vizinhas; buracos viram reticências. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= SHOW_ALL_UP_TO) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const wanted = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const items: PageItem[] = [];
  pages.forEach((n, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && n - previous > 1) {
      items.push(n - previous === 2 ? n - 1 : 'gap');
    }
    items.push(n);
  });
  return items;
}

const navButtonClass =
  'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50';

export function StudentPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: StudentPaginationProps): JSX.Element {
  const safeTotalPages = Math.max(totalPages, 1);
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav
      aria-label="Paginação de alunos"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-sm text-gray-500">
        <p>
          Página {page} de {safeTotalPages}
        </p>
        <p>
          Mostrando {formatCount(first)}–{formatCount(last)} de {formatCount(total)}
        </p>
      </div>

      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <button
            type="button"
            className={navButtonClass}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ‹ Anterior
          </button>
        </li>
        {pageItems(page, safeTotalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-2 text-sm text-gray-400">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Página ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={
                  item === page
                    ? 'min-w-[2.25rem] rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white'
                    : `min-w-[2.25rem] ${navButtonClass}`
                }
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            className={navButtonClass}
            disabled={page >= safeTotalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima ›
          </button>
        </li>
      </ul>
    </nav>
  );
}
