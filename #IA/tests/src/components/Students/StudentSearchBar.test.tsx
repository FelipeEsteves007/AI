import { act, fireEvent, render, screen } from '@testing-library/react';

import { StudentSearchBar } from '@/components/Students/StudentSearchBar';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

function type(value: string): void {
  fireEvent.change(screen.getByRole('searchbox', { name: /buscar/i }), { target: { value } });
}

describe('StudentSearchBar', () => {
  it('não chama antes de 300 ms e chama uma única vez depois, com o último texto', () => {
    const onSearchChange = jest.fn();
    render(<StudentSearchBar value="" onSearchChange={onSearchChange} />);

    type('a');
    act(() => jest.advanceTimersByTime(100));
    type('an');
    act(() => jest.advanceTimersByTime(100));
    type('ana');
    act(() => jest.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('ana');
  });

  it('apara os espaços do termo', () => {
    const onSearchChange = jest.fn();
    render(<StudentSearchBar value="" onSearchChange={onSearchChange} />);

    type('  maria  ');
    act(() => jest.advanceTimersByTime(300));

    expect(onSearchChange).toHaveBeenCalledWith('maria');
  });

  it('não chama quando o termo aparado não mudou', () => {
    const onSearchChange = jest.fn();
    render(<StudentSearchBar value="ana" onSearchChange={onSearchChange} />);

    type('ana ');
    act(() => jest.advanceTimersByTime(300));

    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('acompanha o valor quando ele muda de fora e cancela a busca pendente', () => {
    const onSearchChange = jest.fn();
    const { rerender } = render(<StudentSearchBar value="ana" onSearchChange={onSearchChange} />);

    type('anab');
    rerender(<StudentSearchBar value="" onSearchChange={onSearchChange} />);
    act(() => jest.advanceTimersByTime(300));

    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('');
    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('não apaga o espaço digitado quando o pai devolve o termo aparado', () => {
    const onSearchChange = jest.fn();
    const { rerender } = render(<StudentSearchBar value="" onSearchChange={onSearchChange} />);

    type('maria ');
    act(() => jest.advanceTimersByTime(300));
    expect(onSearchChange).toHaveBeenCalledWith('maria');
    // O pai aplica o termo aparado e o devolve em `value`.
    rerender(<StudentSearchBar value="maria" onSearchChange={onSearchChange} />);

    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('maria ');
    type('maria s');
    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('maria s');
    act(() => jest.advanceTimersByTime(300));
    expect(onSearchChange).toHaveBeenLastCalledWith('maria s');
  });

  it('limita o campo a 255 caracteres, o máximo aceito pelo backend', () => {
    const onSearchChange = jest.fn();
    render(<StudentSearchBar value="" onSearchChange={onSearchChange} />);

    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveAttribute('maxLength', '255');
  });

  it('corta em 255 caracteres um texto maior que chegue ao campo (ex.: colado)', () => {
    const onSearchChange = jest.fn();
    render(<StudentSearchBar value="" onSearchChange={onSearchChange} />);

    // O `maxLength` não barra valores atribuídos por script; a busca não pode passar do limite
    // senão o backend responde 400 e a página volta os filtros ao padrão.
    type('x'.repeat(300));
    act(() => jest.advanceTimersByTime(300));

    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveValue('x'.repeat(255));
    expect(onSearchChange).toHaveBeenCalledWith('x'.repeat(255));
  });
});
