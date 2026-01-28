/**
 * Hook for fetching company invites
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InviteRecord } from "../types/invites";

const COMPANY_INVITES_QUERY_KEY = ["employees", "company-invites"];

export function useCompanyInvites(enabled: boolean = true) {
  return useQuery({
    queryKey: COMPANY_INVITES_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invites")
        .select(
          `
            id,
            email,
            role,
            invite_token,
            expires_at,
            accepted_at,
            created_at,
            first_name,
            last_name
          `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const invites: InviteRecord[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          inviteToken: row.invite_token,
          expiresAt: row.expires_at,
          acceptedAt: row.accepted_at,
          createdAt: row.created_at,
          firstName: row.first_name,
          lastName: row.last_name,
        })) ?? [];

      return invites;
    },
  });
}
