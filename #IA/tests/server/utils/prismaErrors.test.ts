import { Prisma } from '@prisma/client';

import { isRecordNotFound, uniqueViolationTarget } from '@server/utils/prismaErrors';

function knownError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('erro', { code, clientVersion: 'test', meta });
}

describe('uniqueViolationTarget', () => {
  it('P2002 com target em lista devolve os campos', () => {
    expect(uniqueViolationTarget(knownError('P2002', { target: ['email'] }))).toEqual(['email']);
  });

  it('P2002 com target como nome do índice devolve o nome', () => {
    expect(uniqueViolationTarget(knownError('P2002', { target: 'Students_cpf_key' }))).toEqual([
      'Students_cpf_key',
    ]);
  });

  it('P2002 sem meta devolve lista vazia', () => {
    expect(uniqueViolationTarget(knownError('P2002'))).toEqual([]);
  });

  it.each([
    ['outro código do Prisma', knownError('P2025')],
    ['erro comum', new Error('P2002')],
    ['não é erro', { code: 'P2002' }],
  ])('%s devolve null', (_caso, error) => {
    expect(uniqueViolationTarget(error)).toBeNull();
  });
});

describe('isRecordNotFound', () => {
  it('P2025 (registro não encontrado) → true', () => {
    expect(isRecordNotFound(knownError('P2025', { cause: 'Record to update not found.' }))).toBe(
      true,
    );
  });

  it.each([
    ['P2002', knownError('P2002', { target: ['email'] })],
    ['erro comum', new Error('P2025')],
    ['não é erro', { code: 'P2025' }],
  ])('%s → false', (_caso, error) => {
    expect(isRecordNotFound(error)).toBe(false);
  });
});
