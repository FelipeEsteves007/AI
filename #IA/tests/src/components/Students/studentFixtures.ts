import type { StudentDetailResponse, StudentResponse } from '@/types/students';

export function makeStudent(overrides: Partial<StudentResponse> = {}): StudentResponse {
  return {
    id: 's-1',
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '(11) 98765-4321',
    cpf: '12345678909',
    status: 'ativo',
    notes: null,
    lastContactDate: null,
    assignedTo: 'u-2',
    assignedToName: 'Bob Vendedor',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

export const STUDENT_ID = '0b7f5a1e-3c2d-4e5f-8a9b-1c2d3e4f5a6b';

export function makeStudentDetail(
  overrides: Partial<StudentDetailResponse> = {},
): StudentDetailResponse {
  return {
    ...makeStudent({ id: STUDENT_ID, notes: 'Interessado em IA.' }),
    courses: [
      { id: 'c-2', name: 'Delphi Avançado', purchaseDate: '2026-09-10', amount: 497 },
      { id: 'c-1', name: 'Imersão em IA', purchaseDate: '2026-09-01', amount: 297.5 },
    ],
    pipelineLeads: [
      { id: 'l-2', status: 'negotiation', value: 750, createdAt: '2026-09-05T10:00:00.000Z' },
      { id: 'l-1', status: 'prospecting', value: null, createdAt: '2026-09-02T10:00:00.000Z' },
    ],
    tasks: [
      { id: 't-1', title: 'Ligar para João', dueDate: '2026-09-15T12:00:00.000Z', completed: false },
      { id: 't-2', title: 'Enviar boas-vindas', dueDate: '2026-09-16T12:00:00.000Z', completed: true },
      { id: 't-3', title: 'Enviar material', dueDate: '2026-09-18T12:00:00.000Z', completed: false },
    ],
    ...overrides,
  };
}
