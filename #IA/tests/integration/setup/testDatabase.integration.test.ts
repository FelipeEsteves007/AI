import { assertTestDatabase } from './testDatabase';

describe('assertTestDatabase', () => {
  it('aceita um banco que termina em _test e devolve o nome', () => {
    expect(assertTestDatabase('postgresql://u:p@localhost:5432/crm_alunos_test?schema=public')).toBe(
      'crm_alunos_test',
    );
  });

  it('recusa o banco de desenvolvimento', () => {
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/crm_alunos')).toThrow(
      /não termina em "_test"/,
    );
  });

  it('recusa um banco que só contém _test no meio do nome', () => {
    expect(() => assertTestDatabase('postgresql://u:p@localhost:5432/crm_test_alunos')).toThrow(
      /não termina/,
    );
  });

  it('recusa URL ausente ou inválida', () => {
    expect(() => assertTestDatabase(undefined)).toThrow(/DATABASE_URL não definida/);
    expect(() => assertTestDatabase('isto não é url')).toThrow(/DATABASE_URL inválida/);
  });
});
