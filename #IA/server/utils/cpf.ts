/**
 * CPF: validação por dígitos verificadores e normalização para só dígitos. Usado no cadastro de
 * aluno (TASK-008) e pensado para a importação CSV (TASK-012).
 */

/** Com ou sem máscara: `52998224725` ou `529.982.247-25` (pontos e traço opcionais). */
const CPF_FORMAT = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

/** Remove tudo o que não é dígito. Não valida: chame `isValidCpf` antes. */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

/** Dígito verificador sobre os `length` primeiros dígitos, com pesos de `length + 1` até 2. */
function checkDigit(digits: number[], length: number): number {
  const sum = digits
    .slice(0, length)
    .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
  const rest = (sum * 10) % 11;

  return rest === 10 ? 0 : rest;
}

/**
 * CPF válido: formato aceito, 11 dígitos, não é sequência repetida (`111.111.111-11` passa no
 * cálculo, mas não existe) e os dois dígitos verificadores conferem.
 */
export function isValidCpf(value: string): boolean {
  const trimmed = value.trim();

  if (!CPF_FORMAT.test(trimmed)) {
    return false;
  }

  const digits = [...normalizeCpf(trimmed)].map(Number);

  if (digits.every((digit) => digit === digits[0])) {
    return false;
  }

  return checkDigit(digits, 9) === digits[9] && checkDigit(digits, 10) === digits[10];
}
