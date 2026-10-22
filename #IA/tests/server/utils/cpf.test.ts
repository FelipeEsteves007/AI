import { isValidCpf, normalizeCpf } from '@server/utils/cpf';

describe('cpf', () => {
  describe('isValidCpf', () => {
    it.each(['52998224725', '529.982.247-25', '111.444.777-35', '11144477735', ' 111.444.777-35 '])(
      'aceita %p (dígitos verificadores corretos, com ou sem máscara)',
      (value) => {
        expect(isValidCpf(value)).toBe(true);
      },
    );

    it.each(['52998224724', '529.982.247-15', '11144477736'])(
      'recusa %p (dígito verificador errado)',
      (value) => {
        expect(isValidCpf(value)).toBe(false);
      },
    );

    it.each(['5299822472', '529982247250', '', '529.982.247'])('recusa %p (tamanho errado)', (value) => {
      expect(isValidCpf(value)).toBe(false);
    });

    it.each(['00000000000', '11111111111', '999.999.999-99'])(
      'recusa %p (sequência repetida)',
      (value) => {
        expect(isValidCpf(value)).toBe(false);
      },
    );

    it.each(['529a982b247c25', '529/982/247-25', '52998224725x'])(
      'recusa %p (caracteres fora da máscara)',
      (value) => {
        expect(isValidCpf(value)).toBe(false);
      },
    );
  });

  describe('normalizeCpf', () => {
    it('deixa só os dígitos', () => {
      expect(normalizeCpf(' 529.982.247-25 ')).toBe('52998224725');
      expect(normalizeCpf('52998224725')).toBe('52998224725');
    });
  });
});
