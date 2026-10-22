import { LeadStatus, Prisma, StudentStatus } from '@prisma/client';

import type { StudentDetailRecord, StudentRecord } from '@server/types/students';
import { toStudentDetailResponse, toStudentResponse } from '@server/utils/studentMapper';

import {
  makeCourse,
  makeLead,
  makePurchase,
  makeStudent,
  makeTask,
} from '../helpers/studentFixture';

const VENDEDOR_ID = '6f1c1c1e-1111-4a4a-9b9b-000000000001';

function record(overrides: Partial<StudentRecord> = {}): StudentRecord {
  return {
    ...makeStudent({
      name: 'João',
      email: 'joao@exemplo.com',
      phone: '11999998888',
      cpf: '52998224725',
      status: StudentStatus.pausado,
      notes: 'Pediu desconto',
      lastContactDate: new Date('2026-09-10T13:30:00.000Z'),
      assignedTo: VENDEDOR_ID,
      createdAt: new Date('2026-09-01T10:00:00.000Z'),
      updatedAt: new Date('2026-09-02T11:00:00.000Z'),
    }),
    assignedToUser: { name: 'Vendedora Ana' },
    ...overrides,
  };
}

describe('toStudentResponse', () => {
  it('converte datas para ISO 8601 e traz o nome do vendedor', () => {
    const student = record();

    expect(toStudentResponse(student)).toEqual({
      id: student.id,
      name: 'João',
      email: 'joao@exemplo.com',
      phone: '11999998888',
      cpf: '52998224725',
      status: 'pausado',
      notes: 'Pediu desconto',
      lastContactDate: '2026-09-10T13:30:00.000Z',
      assignedTo: VENDEDOR_ID,
      assignedToName: 'Vendedora Ana',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-02T11:00:00.000Z',
    });
  });

  it('devolve null em lastContactDate e assignedToName quando não há', () => {
    const response = toStudentResponse(
      record({ lastContactDate: null, assignedTo: null, assignedToUser: null }),
    );

    expect(response.lastContactDate).toBeNull();
    expect(response.assignedTo).toBeNull();
    expect(response.assignedToName).toBeNull();
  });
});

describe('toStudentDetailResponse', () => {
  it('monta cursos, leads e tarefas com Decimal como number', () => {
    const base = record();
    const course = makeCourse({ name: 'Imersão IA' });
    const concluida = new Date('2026-09-05T09:00:00.000Z');
    const detail: StudentDetailRecord = {
      ...base,
      purchases: [
        {
          ...makePurchase({
            studentId: base.id,
            courseId: course.id,
            purchaseDate: new Date('2026-08-15T00:00:00.000Z'),
            amount: new Prisma.Decimal('1497.90'),
          }),
          course: { id: course.id, name: course.name },
        },
      ],
      pipelineLeads: [
        makeLead({
          studentId: base.id,
          assignedTo: VENDEDOR_ID,
          status: LeadStatus.negotiation,
          value: new Prisma.Decimal('2000.50'),
          createdAt: new Date('2026-09-03T08:00:00.000Z'),
        }),
        makeLead({ studentId: base.id, assignedTo: VENDEDOR_ID, value: null }),
      ],
      tasks: [
        makeTask({
          assignedTo: VENDEDOR_ID,
          relatedTo: base.id,
          title: 'Retornar',
          dueDate: new Date('2026-09-20T15:00:00.000Z'),
        }),
        makeTask({ assignedTo: VENDEDOR_ID, relatedTo: base.id, completedAt: concluida }),
      ],
    };

    const response = toStudentDetailResponse(detail);

    expect(response).toMatchObject(toStudentResponse(base));
    expect(response.courses).toEqual([
      { id: course.id, name: 'Imersão IA', purchaseDate: '2026-08-15', amount: 1497.9 },
    ]);
    expect(response.pipelineLeads).toEqual([
      {
        id: detail.pipelineLeads[0]?.id,
        status: 'negotiation',
        value: 2000.5,
        createdAt: '2026-09-03T08:00:00.000Z',
      },
      expect.objectContaining({ value: null }),
    ]);
    expect(response.tasks).toEqual([
      {
        id: detail.tasks[0]?.id,
        title: 'Retornar',
        dueDate: '2026-09-20T15:00:00.000Z',
        completed: false,
      },
      expect.objectContaining({ completed: true }),
    ]);
    expect(typeof response.courses[0]?.amount).toBe('number');
    expect(response).not.toHaveProperty('purchases');
    expect(response).not.toHaveProperty('assignedToUser');
  });
});
