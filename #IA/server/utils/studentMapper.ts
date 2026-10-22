import type { Prisma } from '@prisma/client';

import type {
  StudentDetailRecord,
  StudentDetailResponse,
  StudentRecord,
  StudentResponse,
} from '@server/types/students';

/** `Decimal` do Prisma vira `number`: o contrato exige número no JSON, não string. */
function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

/** Coluna `@db.Date` chega como meia-noite UTC; o contrato quer só `YYYY-MM-DD`. */
function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Registro de aluno → `StudentResponse` do contrato. */
export function toStudentResponse(student: StudentRecord): StudentResponse {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    cpf: student.cpf,
    status: student.status,
    notes: student.notes,
    lastContactDate: student.lastContactDate?.toISOString() ?? null,
    assignedTo: student.assignedTo,
    assignedToName: student.assignedToUser?.name ?? null,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

/** Registro completo → `StudentDetailResponse`, com cursos, leads e tarefas. */
export function toStudentDetailResponse(student: StudentDetailRecord): StudentDetailResponse {
  return {
    ...toStudentResponse(student),
    courses: student.purchases.map((purchase) => ({
      id: purchase.course.id,
      name: purchase.course.name,
      purchaseDate: toDateOnly(purchase.purchaseDate),
      amount: decimalToNumber(purchase.amount),
    })),
    pipelineLeads: student.pipelineLeads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      value: lead.value === null ? null : decimalToNumber(lead.value),
      createdAt: lead.createdAt.toISOString(),
    })),
    tasks: student.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      completed: task.completedAt !== null,
    })),
  };
}
