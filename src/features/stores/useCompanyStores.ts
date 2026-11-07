import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useProfile } from "@/hooks/useProfile";
import { isPlaceholderStoreName, type StoreHours } from "@/features/stores/storeDraft";

export type CompanyStore = {
  id: string;
  name: string;
  address: string;
  hours: StoreHours;
  archivedAt: string | null;
};

export function useCompanyStores() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const query = useQuery({
    queryKey: ["company-stores", companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyStore[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase // pragma: allowlist secret
        .from("stores")
        .select("id, name, address, hours, archived_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      if (error) return [];
      return (data ?? [])
        .filter((row) => !row.archived_at && !isPlaceholderStoreName(row.name ?? ""))
        .map((row) => ({
          id: row.id,
          name: row.name?.trim() || row.id,
          address: row.address ?? "",
          hours: (row.hours ?? {}) as StoreHours,
          archivedAt: row.archived_at,
        }));
    },
  });
  return {
    stores: query.data ?? [],
    loading: query.isPending,
    refetch: query.refetch,
  };
}
