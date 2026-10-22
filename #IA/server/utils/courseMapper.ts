import type { Course } from '@prisma/client';

import type { CourseResponse, PurchaseRecord, PurchaseResponse } from '@server/types/courses';
import { dateToDateOnly } from '@server/utils/dates';

/** Registro de curso → `CourseResponse`; `Decimal` vira `number`. */
export function toCourseResponse(course: Course): CourseResponse {
  return {
    id: course.id,
    name: course.name,
    description: course.description,
    price: course.price.toNumber(),
    isActive: course.isActive,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

/** Registro de compra → `PurchaseResponse`. */
export function toPurchaseResponse(purchase: PurchaseRecord): PurchaseResponse {
  return {
    id: purchase.id,
    studentId: purchase.studentId,
    courseId: purchase.courseId,
    courseName: purchase.course.name,
    purchaseDate: dateToDateOnly(purchase.purchaseDate),
    amount: purchase.amount.toNumber(),
    notes: purchase.notes,
    createdAt: purchase.createdAt.toISOString(),
  };
}
