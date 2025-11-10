import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { employeesQueryKey } from '@/features/employees/hooks/useEmployees';

export function useEmployeesCacheInvalidation(companyId?: string | null) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (!companyId) return;

    queryClient.invalidateQueries({ queryKey: employeesQueryKey(companyId, true), exact: false });
    queryClient.invalidateQueries({ queryKey: employeesQueryKey(companyId, false), exact: false });
  }, [companyId, queryClient]);
}
