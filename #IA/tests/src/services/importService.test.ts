import { importStudents } from '@/services/importService';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('importService', () => {
  it('envia o CSV como texto em POST /api/students/bulk-import', async () => {
    const report = { imported: 1, failed: 0, duplicates: 0, errors: [], summary: 'ok' };
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => report });

    await expect(importStudents('name,email\nA,a@x.com')).resolves.toEqual(report);

    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/students/bulk-import');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('name,email\nA,a@x.com');
    expect(init.headers).toEqual({ 'Content-Type': 'text/csv' });
  });

  it('400 sobe como ApiError com os detalhes', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'x', code: 'VALIDATION_ERROR', details: { file: 'vazio' } }),
    });

    await expect(importStudents('')).rejects.toMatchObject({
      status: 400,
      details: { file: 'vazio' },
    });
  });
});
