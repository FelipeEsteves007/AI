import { formatMoneyInput, parseMoneyInput } from '@/components/Courses/courseForm';

describe('parseMoneyInput', () => {
  it.each([
    ['997', '997.00'],
    ['997,5', '997.50'],
    ['1997.99', '1997.99'],
    [' 10 ', '10.00'],
  ])('%j → %j', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '-1', '10,999', '1.997,50'])('%j é inválido', (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

it('formatMoneyInput usa vírgula e 2 casas', () => {
  expect(formatMoneyInput(997.5)).toBe('997,50');
});
