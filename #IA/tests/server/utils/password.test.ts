import {
  TEMPORARY_PASSWORD_LENGTH,
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from '@server/utils/password';

/** RN-04: caracteres ambíguos ficam de fora para o admin conseguir ditar a senha. */
const CARACTERES_AMBIGUOS = ['0', 'O', '1', 'l', 'I'];

describe('password utils', () => {
  describe('hashPassword', () => {
    it('gera um hash diferente da senha em texto puro', async () => {
      const hash = await hashPassword('senha123');

      expect(hash).not.toBe('senha123');
      expect(hash).not.toContain('senha123');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('usa bcrypt com 10 rounds', async () => {
      const hash = await hashPassword('senha123');

      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('gera hashes diferentes para a mesma senha (salt aleatório)', async () => {
      const [first, second] = await Promise.all([
        hashPassword('senha123'),
        hashPassword('senha123'),
      ]);

      expect(first).not.toBe(second);
    });
  });

  describe('verifyPassword', () => {
    it('devolve true para a senha correta', async () => {
      const hash = await hashPassword('senha123');

      await expect(verifyPassword('senha123', hash)).resolves.toBe(true);
    });

    it('devolve false para a senha errada', async () => {
      const hash = await hashPassword('senha123');

      await expect(verifyPassword('senha124', hash)).resolves.toBe(false);
    });

    it('devolve false para hash inválido', async () => {
      await expect(verifyPassword('senha123', 'nao-e-um-hash')).resolves.toBe(false);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('gera senha com o tamanho de TEMPORARY_PASSWORD_LENGTH', () => {
      expect(TEMPORARY_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
      expect(generateTemporaryPassword()).toHaveLength(TEMPORARY_PASSWORD_LENGTH);
    });

    it('gera uma senha diferente a cada chamada', () => {
      const geradas = new Set(
        Array.from({ length: 50 }, () => generateTemporaryPassword()),
      );

      expect(geradas.size).toBe(50);
    });

    it('usa apenas letras e dígitos, sem caracteres ambíguos', () => {
      const amostra = Array.from({ length: 200 }, () => generateTemporaryPassword());

      for (const senha of amostra) {
        expect(senha).toMatch(/^[A-Za-z0-9]+$/);
        for (const ambiguo of CARACTERES_AMBIGUOS) {
          expect(senha).not.toContain(ambiguo);
        }
      }
    });
  });
});
