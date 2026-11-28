import { useCompany } from "@/hooks/useCompany";
import { DEFAULT_SHOP_TIMEZONE, normalizeShopTimeZone } from "@/features/tasks/utils/taskDueTiming";

export function useShopTimeZone(): string {
  const { company } = useCompany();
  return normalizeShopTimeZone(company?.timezone ?? DEFAULT_SHOP_TIMEZONE);
}