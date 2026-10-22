import { randomInt } from 'node:crypto';

import bcrypt from 'bcryptjs';

/** Rounds do bcrypt exigidos pela constitution (Decisões de Segurança) e pela RN-13. */
const BCRYPT_ROUNDS = 10;

/** Tamanho da senha provisória gerada pelo sistema (RN-04). */
export const TEMPORARY_PASSWORD_LENGTH = 14;

/** Sem caracteres ambíguos (0/O, 1/l/I) para o admin conseguir ditar a senha provisória. */
const TEMPORARY_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Gera o hash bcrypt (10 rounds) da senha em texto puro. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Compara a senha em texto puro com o hash guardado. Nunca lança para hash inválido. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Gera uma senha provisória aleatória, com entropia criptográfica (node:crypto). */
export function generateTemporaryPassword(): string {
  let password = '';

  for (let i = 0; i < TEMPORARY_PASSWORD_LENGTH; i += 1) {
    password += TEMPORARY_PASSWORD_ALPHABET[randomInt(TEMPORARY_PASSWORD_ALPHABET.length)];
  }

  return password;
}
