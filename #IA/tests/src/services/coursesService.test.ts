import {
  createCourse,
  createPurchase,
  deleteCourse,
  listCourses,
  updateCourse,
} from '@/services/coursesService';
import type { CourseResponse, PurchaseResponse } from '@/types/courses';

const fetchMock = jest.fn();

const course: CourseResponse = {
  id: 'c-1',
  name: 'Delphi',
  description: null,
  price: 997,
  isActive: true,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

function jsonResponse(status: number, body?: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function lastCall(): [string, RequestInit] {
  return fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('coursesService', () => {
  it('lista com query só dos parâmetros informados', async () => {
    const list = { data: [course], pagination: { page: 1, limit: 500, total: 1, totalPages: 1 } };
    fetchMock.mockResolvedValue(jsonResponse(200, list));

    await expect(listCourses({ isActive: true, limit: 500 })).resolves.toEqual(list);
    expect(lastCall()[0]).toBe('/api/courses?limit=500&isActive=true');

    await listCourses();
    expect(lastCall()[0]).toBe('/api/courses');
  });

  it('cria, edita e exclui nos métodos certos', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, course));
    await createCourse({ name: 'Delphi', price: '997.00' });
    expect(lastCall()[0]).toBe('/api/courses');
    expect(lastCall()[1].method).toBe('POST');

    fetchMock.mockResolvedValue(jsonResponse(200, course));
    await updateCourse('c-1', { name: 'Novo' });
    expect(lastCall()[0]).toBe('/api/courses/c-1');
    expect(lastCall()[1].method).toBe('PUT');

    fetchMock.mockResolvedValue(jsonResponse(204));
    await deleteCourse('c-1');
    expect(lastCall()[1].method).toBe('DELETE');
  });

  it('409 na exclusão sobe como ApiError com o código', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: 'x', code: 'COURSE_HAS_PURCHASES' }),
    );

    await expect(deleteCourse('c-1')).rejects.toMatchObject({ code: 'COURSE_HAS_PURCHASES' });
  });

  it('registra compra em POST /api/students/{id}/purchases', async () => {
    const purchase: PurchaseResponse = {
      id: 'p-1',
      studentId: 's-1',
      courseId: 'c-1',
      courseName: 'Delphi',
      purchaseDate: '2026-09-10',
      amount: 997,
      notes: null,
      createdAt: '2026-09-10T10:00:00.000Z',
    };
    fetchMock.mockResolvedValue(jsonResponse(201, purchase));

    await expect(
      createPurchase('s-1', { courseId: 'c-1', purchaseDate: '2026-09-10' }),
    ).resolves.toEqual(purchase);
    expect(lastCall()[0]).toBe('/api/students/s-1/purchases');
    expect(lastCall()[1].method).toBe('POST');
  });
});
