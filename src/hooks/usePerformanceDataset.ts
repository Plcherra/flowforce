// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { fetchPerformanceDataset } from '@/services/performance/performanceService';
import type { PerformanceDataset } from '@/services/performance/performanceTypes';

export function usePerformanceDataset() {
  return useQuery<PerformanceDataset, Error>({
    queryKey: ['performance-dataset'],
    queryFn: fetchPerformanceDataset,
    staleTime: 1000 * 60 * 5,
  });
}
