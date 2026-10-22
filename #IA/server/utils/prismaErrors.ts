import { Prisma } from '@prisma/client';

/**
 * Se o erro é a violação de unicidade do Prisma (`P2002`), devolve o `meta.target` sempre como
 * lista: os campos (`['email']`) ou, conforme o driver, o nome do índice (`Students_email_key`).
 * Qualquer outro erro devolve `null`.
 */
export function uniqueViolationTarget(error: unknown): string[] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }

  const target = error.meta?.target;

  if (Array.isArray(target)) {
    return target.map(String);
  }

  return typeof target === 'string' ? [target] : [];
}

/** Verdadeiro quando o banco recusou por chave estrangeira (`P2003`), ex.: curso com compras. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

/**
 * Verdadeiro quando o Prisma não achou o registro que devia alterar ou apagar (`P2025`): o id
 * não existe, ou o `where` com escopo (S6-11) não casou. Quem chama traduz para 404.
 */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
