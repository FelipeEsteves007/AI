import { getDashboardMetrics } from '@/services/dashboardService';
import { createLead, listLeads, updateLead, updateLeadStatus } from '@/services/pipelineService';
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskCompleted,
  updateTask,
} from '@/services/tasksService';

const fetchMock = jest.fn();

function ok(body: unknown, status = 200): Response {
  return { ok: true, status, json: async () => body } as unknown as Response;
}

function call(index = -1): [string, RequestInit] {
  const calls = fetchMock.mock.calls;
  return calls[index < 0 ? calls.length + index : index] as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(ok({ data: [] }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('serviços da Sprint 8', () => {
  it('dashboard: período e datas só no personalizado', async () => {
    await getDashboardMetrics({ period: '7days', from: 'x', to: 'y' });
    expect(call()[0]).toBe('/api/dashboard/metrics?period=7days');

    await getDashboardMetrics({ period: 'custom', from: '2026-01-01', to: '2026-02-01' });
    expect(call()[0]).toBe('/api/dashboard/metrics?period=custom&from=2026-01-01&to=2026-02-01');
  });

  it('pipeline: rotas e métodos', async () => {
    await listLeads({ assignedTo: 'u-1', from: '2026-09-01' });
    expect(call()[0]).toBe('/api/pipeline?assignedTo=u-1&from=2026-09-01');

    await createLead({ studentId: 's-1' });
    expect(call()).toEqual(['/api/pipeline', expect.objectContaining({ method: 'POST' })]);

    await updateLead('l-1', { value: '10.00' });
    expect(call()).toEqual(['/api/pipeline/l-1', expect.objectContaining({ method: 'PUT' })]);

    await updateLeadStatus('l-1', 'sold');
    expect(call()[0]).toBe('/api/pipeline/l-1/status');
    expect(JSON.parse(String(call()[1].body))).toEqual({ status: 'sold' });
  });

  it('tarefas: rotas, métodos e filtros', async () => {
    await expect(listTasks({ completed: false, priority: 'high' })).resolves.toEqual([]);
    expect(call()[0]).toBe('/api/tasks?completed=false&priority=high');

    await createTask({ title: 'X', dueDate: '2026-10-01' });
    expect(call()[1].method).toBe('POST');

    await updateTask('t-1', { title: 'Y' });
    expect(call()[0]).toBe('/api/tasks/t-1');

    await setTaskCompleted('t-1', false);
    expect(call()[0]).toBe('/api/tasks/t-1/complete');
    expect(JSON.parse(String(call()[1].body))).toEqual({ completed: false });

    fetchMock.mockResolvedValue(ok(null, 204));
    await deleteTask('t-1');
    expect(call()[1].method).toBe('DELETE');
  });
});
