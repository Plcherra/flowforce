import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type ErrorMap<T> = Partial<Record<keyof T, string>>;

export function useInventoryFormState<T extends Record<string, string>>(initialState: T) {
  const { toast } = useToast();
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<ErrorMap<T>>({});

  const setField = useCallback((field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(initialState);
    setErrors({});
  }, [initialState]);

  const showValidationToast = useCallback(() => {
    toast({
      title: 'Missing information',
      description: 'Please review the highlighted fields.',
      variant: 'destructive',
    });
  }, [toast]);

  return {
    values,
    errors,
    setField,
    setErrors,
    reset,
    showValidationToast,
  };
}
