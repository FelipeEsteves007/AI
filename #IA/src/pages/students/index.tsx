import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EmailFormModal } from '@/components/Students/EmailFormModal';
import { StudentDeleteDialog } from '@/components/Students/StudentDeleteDialog';
import { StudentFilters } from '@/components/Students/StudentFilters';
import type { SellerOption } from '@/components/Students/StudentFilters';
import { StudentPagination } from '@/components/Students/StudentPagination';
import { SEARCH_MAX_LENGTH, StudentSearchBar } from '@/components/Students/StudentSearchBar';
import { StudentTable } from '@/components/Students/StudentTable';
import { StudentTableSkeleton } from '@/components/Students/StudentTableSkeleton';
import { isStudentStatus } from '@/components/Students/studentFormat';
import { useAuth } from '@/context/AuthContext';
import { isApiError } from '@/services/apiClient';
import { sendBulkEmail } from '@/services/emailService';
import type { SendEmailPayload } from '@/services/emailService';
import { downloadStudentsCsv } from '@/services/reportsService';
import { deleteStudent, listStudents } from '@/services/studentsService';
import { listUsers } from '@/services/usersService';
import type {
  ListStudentsParams,
  SortOrder,
  StudentListResponse,
  StudentResponse,
  StudentSortBy,
  StudentStatus,
} from '@/types/students';
import { isUuid } from '@/utils/uuid';

const PAGE_SIZE = 50;

const LOAD_ERROR = 'Não foi possível carregar os alunos agora. Tente novamente em instantes.';
const DELETE_FORBIDDEN = 'Você não tem permissão para excluir alunos.';
const DELETE_NOT_FOUND =
  'Este aluno não foi encontrado — talvez já tenha sido excluído. A lista foi atualizada.';
const DELETE_GENERIC = 'Não foi possível excluir o aluno agora. Tente novamente em instantes.';

const SORT_COLUMNS: readonly StudentSortBy[] = ['name', 'createdAt', 'status'];

interface ListState {
  page: number;
  status: StudentStatus | '';
  search: string;
  assignedTo: string;
  sortBy: StudentSortBy;
  order: SortOrder;
}

const DEFAULT_STATE: ListState = {
  page: 1,
  status: '',
  search: '',
  assignedTo: '',
  sortBy: 'createdAt',
  order: 'desc',
};

type UrlQuery = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

/** Lê o estado da URL, descartando o que não for válido. */
function stateFromQuery(query: UrlQuery): ListState {
  const page = Number.parseInt(firstValue(query.page), 10);
  const status = firstValue(query.status);
  const sortBy = firstValue(query.sortBy);
  const order = firstValue(query.order);
  const assignedTo = firstValue(query.assignedTo);

  return {
    page: Number.isInteger(page) && page > 0 ? page : DEFAULT_STATE.page,
    status: isStudentStatus(status) ? status : '',
    search: firstValue(query.search).trim().slice(0, SEARCH_MAX_LENGTH).trim(),
    assignedTo: isUuid(assignedTo) ? assignedTo : '',
    sortBy: (SORT_COLUMNS as readonly string[]).includes(sortBy)
      ? (sortBy as StudentSortBy)
      : DEFAULT_STATE.sortBy,
    order: order === 'asc' || order === 'desc' ? order : DEFAULT_STATE.order,
  };
}

/** Só o que difere do padrão vai para a URL. */
function queryFromState(state: ListState): Record<string, string> {
  const query: Record<string, string> = {};
  if (state.page !== DEFAULT_STATE.page) query.page = String(state.page);
  if (state.status) query.status = state.status;
  if (state.search) query.search = state.search;
  if (state.assignedTo) query.assignedTo = state.assignedTo;
  if (state.sortBy !== DEFAULT_STATE.sortBy) query.sortBy = state.sortBy;
  if (state.order !== DEFAULT_STATE.order) query.order = state.order;
  return query;
}

function paramsFromState(state: ListState): ListStudentsParams {
  const params: ListStudentsParams = {
    page: state.page,
    limit: PAGE_SIZE,
    sortBy: state.sortBy,
    order: state.order,
  };
  if (state.status) params.status = state.status;
  if (state.search) params.search = state.search;
  if (state.assignedTo) params.assignedTo = state.assignedTo;
  return params;
}

function deleteErrorFor(error: unknown): string {
  if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
    return DELETE_FORBIDDEN;
  }
  return DELETE_GENERIC;
}

function isValidationError(error: unknown): boolean {
  return isApiError(error) && (error.status === 400 || error.code === 'VALIDATION_ERROR');
}

function isDefaultState(state: ListState): boolean {
  return JSON.stringify(queryFromState(state)) === JSON.stringify(queryFromState(DEFAULT_STATE));
}

function isNotFound(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.code === 'NOT_FOUND');
}

export default function StudentsPage(): JSX.Element {
  const router = useRouter();
  const { can } = useAuth();
  // Cosmético (RBAC real no backend): excluir responde 403 sem `students:delete`, e o
  // `GET /api/users` que alimenta o filtro de vendedor é só do admin (S6-8).
  const canDelete = can('students:delete');
  const canFilterBySeller = can('users:manage');

  const [initialized, setInitialized] = useState(router.isReady);
  const [listState, setListState] = useState<ListState>(() =>
    router.isReady ? stateFromQuery(router.query) : DEFAULT_STATE,
  );
  const lastQueryKeyRef = useRef<string>(JSON.stringify(queryFromState(listState)));

  const [response, setResponse] = useState<StudentListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);

  const [sellers, setSellers] = useState<SellerOption[] | null>(null);

  const [pendingDelete, setPendingDelete] = useState<StudentResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pageAlert, setPageAlert] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Cosmético: exportar responde 403 no backend sem `data:view-all` (S9-3).
  const canExport = can('data:view-all');
  /** Destino do foco ao fechar a confirmação quando a linha de quem abriu sai da lista. */
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Em páginas estáticas o router só fica pronto depois da hidratação.
  useEffect(() => {
    if (initialized || !router.isReady) {
      return;
    }
    const fromUrl = stateFromQuery(router.query);
    lastQueryKeyRef.current = JSON.stringify(queryFromState(fromUrl));
    setListState(fromUrl);
    setInitialized(true);
  }, [initialized, router.isReady, router.query]);

  // Filtros, busca e página ficam na URL (sem recarregar a página).
  useEffect(() => {
    if (!initialized) {
      return;
    }
    const query = queryFromState(listState);
    const key = JSON.stringify(query);
    if (key === lastQueryKeyRef.current) {
      return;
    }
    lastQueryKeyRef.current = key;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [initialized, listState, router]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    listStudents(paramsFromState(listState))
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        setResponse(result);
        setLoadError(null);
        // Página que deixou de existir (ex.: excluiu o último aluno dela): volta para a última.
        const { totalPages } = result.pagination;
        if (result.data.length === 0 && listState.page > 1 && listState.page > totalPages) {
          setListState((current) => ({ ...current, page: Math.max(totalPages, 1) }));
        }
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        // Filtro recusado pelo backend (ex.: URL editada à mão): volta ao padrão em vez de
        // repetir a mesma query. Já no padrão, mostra o erro para não entrar em laço.
        if (isValidationError(error) && !isDefaultState(listState)) {
          setListState(DEFAULT_STATE);
          return;
        }
        setLoadError(LOAD_ERROR);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, [initialized, listState, reloadToken]);

  useEffect(() => {
    if (!canFilterBySeller) {
      setSellers(null);
      return;
    }
    let active = true;
    listUsers()
      .then((users) => {
        if (!active) return;
        setSellers(
          users
            .map((user) => ({ id: user.id, name: user.name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
        );
      })
      .catch(() => {
        // Sem a lista, a tela segue sem o filtro de vendedor; não vale um erro na cara.
        if (active) setSellers(null);
      });
    return () => {
      active = false;
    };
  }, [canFilterBySeller]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const updateFilters = useCallback((patch: Partial<Omit<ListState, 'page'>>) => {
    setNotice(null);
    setListState((current) => ({ ...current, ...patch, page: 1 }));
  }, []);

  function handleSortChange(column: StudentSortBy): void {
    setListState((current) => {
      const order: SortOrder =
        current.sortBy === column
          ? current.order === 'asc'
            ? 'desc'
            : 'asc'
          : column === 'createdAt'
            ? 'desc'
            : 'asc';
      return { ...current, sortBy: column, order, page: 1 };
    });
  }

  function openStudent(student: StudentResponse): void {
    void router.push(`/students/${encodeURIComponent(student.id)}`);
  }

  function requestDelete(student: StudentResponse): void {
    setDeleteError(null);
    setPageAlert(null);
    setNotice(null);
    setPendingDelete(student);
  }

  /**
   * Tira o aluno da lista na mesma renderização que fecha a confirmação: assim, quando o dialog
   * desmonta, o botão que o abriu já saiu do DOM e o foco vai para o título, em vez de voltar ao
   * botão e cair no `body` quando o recarregamento o remover. O recarregamento corrige o resto.
   */
  function removeFromList(studentId: string): void {
    setResponse((current) => {
      if (!current || !current.data.some((item) => item.id === studentId)) return current;
      return {
        data: current.data.filter((item) => item.id !== studentId),
        pagination: { ...current.pagination, total: Math.max(current.pagination.total - 1, 0) },
      };
    });
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const student = pendingDelete;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteStudent(student.id);
      removeFromList(student.id);
      setPendingDelete(null);
      setNotice(`Aluno ${student.name} foi excluído.`);
      reload();
    } catch (error) {
      if (isNotFound(error)) {
        removeFromList(student.id);
        setPendingDelete(null);
        setPageAlert(DELETE_NOT_FOUND);
        reload();
      } else {
        setDeleteError(deleteErrorFor(error));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleSelect(student: StudentResponse): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(student.id)) next.delete(student.id);
      else next.add(student.id);
      return next;
    });
  }

  function toggleSelectAll(select: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const student of response?.data ?? []) {
        if (select) next.add(student.id);
        else next.delete(student.id);
      }
      return next;
    });
  }

  async function sendToSelection(payload: SendEmailPayload): Promise<void> {
    const result = await sendBulkEmail([...selectedIds], payload);
    setIsEmailOpen(false);
    setSelectedIds(new Set());
    setPageAlert(null);
    setNotice(
      result.failed === 0
        ? `E-mail enviado para ${result.sent} ${result.sent === 1 ? 'aluno' : 'alunos'}.`
        : `E-mail enviado para ${result.sent}; ${result.failed} não ${result.failed === 1 ? 'recebeu' : 'receberam'}.`,
    );
  }

  async function exportCsv(): Promise<void> {
    setIsExporting(true);
    setPageAlert(null);
    try {
      await downloadStudentsCsv({
        status: listState.status || undefined,
        search: listState.search || undefined,
        assignedTo: listState.assignedTo || undefined,
      });
    } catch {
      setPageAlert('Não foi possível exportar os alunos agora. Tente novamente em instantes.');
    } finally {
      setIsExporting(false);
    }
  }

  const hasActiveFilters = Boolean(listState.status || listState.search || listState.assignedTo);
  const clearFilters = (): void => updateFilters({ status: '', search: '', assignedTo: '' });

  const students = response?.data ?? [];
  const pagination = response?.pagination;

  function renderContent(): JSX.Element {
    if (response === null) {
      if (loadError && !isLoading) {
        return (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
            <p role="alert" className="text-sm text-red-700">
              {loadError}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 rounded-md bg-white px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              Tentar novamente
            </button>
          </div>
        );
      }
      return <StudentTableSkeleton />;
    }

    if (students.length === 0) {
      // Lista esvaziada enquanto recarrega (ex.: excluiu o último da página): não é "vazio" ainda.
      if (isLoading) {
        return <StudentTableSkeleton />;
      }
      return (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-10 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-sm text-gray-500">Nenhum aluno encontrado com esses filtros.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-md px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Limpar filtros
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">Nenhum aluno cadastrado ainda.</p>
          )}
        </div>
      );
    }

    return (
      <div aria-busy={isLoading} className={isLoading ? 'opacity-60 transition-opacity' : undefined}>
        <StudentTable
          students={students}
          sortBy={listState.sortBy}
          order={listState.order}
          onSortChange={handleSortChange}
          onOpen={openStudent}
          onEdit={openStudent}
          onDelete={canDelete ? requestDelete : undefined}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
        {pagination ? (
          <div className="mt-4">
            <StudentPagination
              page={listState.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(page) => {
                setNotice(null);
                setListState((current) => ({ ...current, page }));
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 focus:outline-none">
            Alunos
          </h1>
          <p className="mt-1 text-sm text-gray-500">Busque, filtre e acompanhe os alunos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={selectedIds.size === 0}
            onClick={() => setIsEmailOpen(true)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar e-mail ({selectedIds.size})
          </button>
          {canExport ? (
            <button
              type="button"
              disabled={isExporting}
              onClick={() => {
                void exportCsv();
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {isExporting ? 'Exportando…' : 'Exportar CSV'}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <StudentSearchBar
          value={listState.search}
          onSearchChange={(search) => updateFilters({ search })}
        />
        <StudentFilters
          status={listState.status}
          assignedTo={listState.assignedTo}
          sellers={sellers}
          hasActiveFilters={hasActiveFilters}
          onStatusChange={(status) => updateFilters({ status })}
          onAssignedToChange={(assignedTo) => updateFilters({ assignedTo })}
          onClear={clearFilters}
        />
      </div>

      {pageAlert ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {pageAlert}
        </p>
      ) : null}

      {response !== null && loadError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {loadError}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6">{renderContent()}</div>

      {isEmailOpen ? (
        <EmailFormModal
          recipients={`${selectedIds.size} ${selectedIds.size === 1 ? 'aluno selecionado' : 'alunos selecionados'}`}
          onSubmit={sendToSelection}
          onClose={() => setIsEmailOpen(false)}
        />
      ) : null}

      {pendingDelete ? (
        <StudentDeleteDialog
          student={pendingDelete}
          isDeleting={isDeleting}
          error={deleteError}
          returnFocusFallbackRef={headingRef}
          onConfirm={() => {
            void confirmDelete();
          }}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}
