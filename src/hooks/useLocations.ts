import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./useProfile";
import { logger } from "@/utils/logger";

export interface OrganizationLocation {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  timezone?: string | null;
  is_active?: boolean | null;
  capacity?: number | null;
}

export function useLocations() {
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;

  const queryResult = useQuery<OrganizationLocation[]>({
    queryKey: ["locations", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) {
        return [];
      }

      try {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, address, archived_at")
          .is("archived_at", null)
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (error) {
          logger.error("Failed to load locations", { error, tags: ["error"] });
          return [];
        }

        return (data ?? []).map((location) => ({
            id: location.id,
            name: location.name ?? "Untitled Location",
            address: location.address ?? null,
            city: null,
            state: null,
            country: null,
            timezone: "UTC",
            is_active: true,
            capacity: null,
          }));
      } catch (error) {
        logger.error("Unexpected locations query error", {
          error,
          tags: ["error"],
        });
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const locations = Array.isArray(queryResult.data) ? queryResult.data : [];

  return {
    locations,
    loading: queryResult.isPending,
    error:
      queryResult.error instanceof Error ? queryResult.error.message : null,
    refetchLocations: queryResult.refetch,
  };
}
