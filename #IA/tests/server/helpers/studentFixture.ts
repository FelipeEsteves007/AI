import { randomUUID } from 'node:crypto';

import {
  LeadStatus,
  Prisma,
  StudentStatus,
  TaskPriority,
  type Course,
  type PipelineLead,
  type Purchase,
  type Student,
  type Task,
} from '@prisma/client';

const BASE_DATE = new Date('2026-09-01T10:00:00.000Z');

/** Aluno completo (como o Prisma devolve). */
export function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: randomUUID(),
    name: 'Aluno',
    email: `aluno-${randomUUID()}@exemplo.com`,
    phone: null,
    cpf: null,
    status: StudentStatus.ativo,
    notes: null,
    lastContactDate: null,
    assignedTo: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

/** `count` alunos com `createdAt` crescente (1 minuto entre eles), a partir de `start`. */
export function makeStudents(
  count: number,
  overrides: (index: number) => Partial<Student> = () => ({}),
  start: Date = BASE_DATE,
): Student[] {
  return Array.from({ length: count }, (_, index) =>
    makeStudent({
      name: `Aluno ${String(index).padStart(4, '0')}`,
      email: `aluno${index}-${randomUUID()}@exemplo.com`,
      createdAt: new Date(start.getTime() + index * 60_000),
      ...overrides(index),
    }),
  );
}

export function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: randomUUID(),
    name: 'Curso',
    description: null,
    price: new Prisma.Decimal('997.00'),
    isActive: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makePurchase(
  overrides: Partial<Purchase> & Pick<Purchase, 'studentId' | 'courseId'>,
): Purchase {
  return {
    id: randomUUID(),
    purchaseDate: new Date('2026-08-15T00:00:00.000Z'),
    amount: new Prisma.Decimal('997.00'),
    notes: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makeLead(
  overrides: Partial<PipelineLead> & Pick<PipelineLead, 'studentId' | 'assignedTo'>,
): PipelineLead {
  return {
    id: randomUUID(),
    status: LeadStatus.prospecting,
    value: null,
    lostReason: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}

export function makeTask(overrides: Partial<Task> & Pick<Task, 'assignedTo'>): Task {
  return {
    id: randomUUID(),
    title: 'Ligar para o aluno',
    description: null,
    relatedTo: null,
    relatedType: 'student',
    priority: TaskPriority.normal,
    dueDate: new Date('2026-09-20T15:00:00.000Z'),
    completedAt: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}
