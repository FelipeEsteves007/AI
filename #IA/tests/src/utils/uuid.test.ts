import { isUuid } from '@/utils/uuid';

describe('isUuid', () => {
  it('aceita uuid em minúsculas e maiúsculas', () => {
    expect(isUuid('0b7f5a1e-3c2d-4e5f-8a9b-1c2d3e4f5a6b')).toBe(true);
    expect(isUuid('0B7F5A1E-3C2D-4E5F-8A9B-1C2D3E4F5A6B')).toBe(true);
  });

  it.each(['', 'abc', 's-1', '0b7f5a1e-3c2d-4e5f-8a9b-1c2d3e4f5a6', '0b7f5a1e3c2d4e5f8a9b1c2d3e4f5a6b'])(
    'recusa %p',
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );

  it('recusa o que não é string', () => {
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(['0b7f5a1e-3c2d-4e5f-8a9b-1c2d3e4f5a6b'])).toBe(false);
  });
});
