import { sendBulkEmail, sendEmail } from '@/services/emailService';
import { downloadStudentsCsv } from '@/services/reportsService';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('emailService', () => {
  it('envia individual e em seleção nos endpoints certos', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ messageId: 'm', to: 'a@b.com' }) });

    await sendEmail('s-1', { subject: 'S', body: 'B' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/email/send');
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual({
      studentId: 's-1',
      subject: 'S',
      body: 'B',
    });

    await sendBulkEmail(['s-1', 's-2'], { subject: 'S', body: 'B' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/email/send-bulk');
  });
});

describe('reportsService', () => {
  it('baixa o CSV com os filtros e o nome de arquivo do servidor', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-disposition': 'attachment; filename="alunos-2026-09-14.csv"' }),
      blob: async () => new Blob(['x']),
    });
    const createObjectURL = jest.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
    let downloaded = '';
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloaded = this.download;
      });

    await downloadStudentsCsv({ status: 'ativo', search: '' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/reports/students-export?format=csv&status=ativo');
    expect(downloaded).toBe('alunos-2026-09-14.csv');
    click.mockRestore();
  });

  it('403 vira ApiError FORBIDDEN', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });

    await expect(downloadStudentsCsv({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
