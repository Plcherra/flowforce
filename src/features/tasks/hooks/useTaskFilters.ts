import { useMemo, useState } from 'react';

type BaseFilter = 'all' | 'other' | string;

export function useTaskFilters<
  StatusFilter extends BaseFilter = BaseFilter,
  PriorityFilter extends BaseFilter = BaseFilter,
>() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all' as StatusFilter);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all' as PriorityFilter);
  const [searchTerm, setSearchTerm] = useState('');

  const filtersActive = useMemo(
    () => statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm.trim().length > 0,
    [statusFilter, priorityFilter, searchTerm]
  );

  const resetFilters = () => {
    setStatusFilter('all' as StatusFilter);
    setPriorityFilter('all' as PriorityFilter);
    setSearchTerm('');
  };

  return {
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchTerm,
    setSearchTerm,
    filtersActive,
    resetFilters,
  };
}
