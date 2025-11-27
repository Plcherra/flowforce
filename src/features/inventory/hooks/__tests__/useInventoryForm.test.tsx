// @ts-nocheck
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInventoryFormState } from '../useInventoryForm';

const toastMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

describe('useInventoryFormState', () => {
  const initialState = {
    fieldA: '',
    fieldB: '',
  };

  beforeEach(() => {
    toastMock.mockReset();
  });

  it('updates values and clears field errors when setField is called', () => {
    const { result } = renderHook(() => useInventoryFormState(initialState));

    act(() => {
      result.current.setErrors({ fieldA: 'Required' });
      result.current.setField('fieldA', 'hello');
    });

    expect(result.current.values.fieldA).toBe('hello');
    expect(result.current.errors.fieldA).toBeUndefined();
  });

  it('resets values and errors', () => {
    const { result } = renderHook(() => useInventoryFormState(initialState));

    act(() => {
      result.current.setField('fieldA', 'hello');
      result.current.setErrors({ fieldA: 'Required' });
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialState);
    expect(result.current.errors).toEqual({});
  });

  it('shows a validation toast when showValidationToast is invoked', () => {
    const { result } = renderHook(() => useInventoryFormState(initialState));

    act(() => result.current.showValidationToast());

    expect(toastMock).toHaveBeenCalledWith({
      title: 'Missing information',
      description: 'Please review the highlighted fields.',
      variant: 'destructive',
    });
  });
});
