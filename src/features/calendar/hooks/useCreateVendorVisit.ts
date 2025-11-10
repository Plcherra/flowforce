import { useEvents } from '@/hooks/useEvents';

export function useCreateVendorVisit() {
  const { createVendorVisit } = useEvents();
  return {
    createVendorVisit,
  };
}
