import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} from '@/services/studentsService';
import type { StudentDetailResponse, StudentListResponse, StudentResponse } from '@/types/students';

const fetchMock = jest.fn();

const student: StudentResponse = {
  id: 's-1',
  name: 'João Silva',
  email: 'joao@email.com',
  phone: null,
  cpf: '12345678909',
  status: 'ativo',
  notes: null,
  lastContactDate: null,
  assignedTo: 'u-2',
  assignedToName: 'Bob',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function lastCall(): [string, RequestInit] {
  return fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('studentsService', () => {
  const list: StudentListResponse = {
    data: [student],
    pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
  };

  it('lista em GET /api/students sem query quando não há parâmetros', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, list));

    await expect(listStudents()).resolves.toEqual(list);

    const [path, init] = lastCall();
    expect(path).toBe('/api/students');
    expect(init.method).toBe('GET');
  });

  it('monta a query com todos os filtros e omite os vazios', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, list));

    await listStudents({
      page: 2,
      limit: 50,
      status: 'pausado',
      search: 'ana maria',
      assignedTo: '',
      sortBy: 'name',
      order: 'asc',
    });

    const [path] = lastCall();
    const url = new URL(path, 'http://localhost');
    expect(url.pathname).toBe('/api/students');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      limit: '50',
      status: 'pausado',
      search: 'ana maria',
      sortBy: 'name',
      order: 'asc',
    });
  });

  it('busca o detalhe em GET /api/students/{id}', async () => {
    const detail: StudentDetailResponse = { ...student, courses: [], pipelineLeads: [], tasks: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, detail));

    await expect(getStudent('s-1')).resolves.toEqual(detail);
    expect(lastCall()[0]).toBe('/api/students/s-1');
  });

  it('propaga 404 NOT_FOUND do detalhe', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'Não encontrado', code: 'NOT_FOUND' }));

    await expect(getStudent('s-9')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('cria em POST /api/students', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, student));

    await expect(createStudent({ name: 'João Silva', email: 'joao@email.com' })).resolves.toEqual(
      student,
    );
    const [path, init] = lastCall();
    expect(path).toBe('/api/students');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'João Silva', email: 'joao@email.com' });
  });

  it('atualiza em PUT /api/students/{id}', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...student, status: 'inativo' }));

    const updated = await updateStudent('s-1', { status: 'inativo' });

    expect(updated.status).toBe('inativo');
    const [path, init] = lastCall();
    expect(path).toBe('/api/students/s-1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(String(init.body))).toEqual({ status: 'inativo' });
  });

  it('exclui em DELETE /api/students/{id} (204)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));

    await expect(deleteStudent('s-1')).resolves.toBeUndefined();
    const [path, init] = lastCall();
    expect(path).toBe('/api/students/s-1');
    expect(init.method).toBe('DELETE');
  });

  it('codifica o id na URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(204));

    await deleteStudent('a/b');
    expect(lastCall()[0]).toBe('/api/students/a%2Fb');
  });

  it.each([
    ['listStudents', () => listStudents()],
    ['getStudent', () => getStudent('s-1')],
    ['createStudent', () => createStudent({ name: 'João', email: 'joao@email.com' })],
    ['updateStudent', () => updateStudent('s-1', { name: 'João' })],
  ])('%s lança erro em vez de devolver null quando a API responde sem corpo', async (_name, call) => {
    fetchMock.mockResolvedValue(jsonResponse(200, null));

    await expect(call()).rejects.toMatchObject({ code: 'EMPTY_RESPONSE' });
  });

  it('propaga 403 FORBIDDEN da exclusão', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { error: 'Proibido', code: 'FORBIDDEN' }));

    await expect(deleteStudent('s-1')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
