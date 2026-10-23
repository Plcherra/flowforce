import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useProfile } from "@/hooks/useProfile";
import type { TaskCreateScope } from "@/features/roles/constants/taskCreateScope";
import {
  readTaskCreateGrants,
  scopeForPerson,
} from "@/features/tasks/utils/taskAssigneeScope";

export function useTaskAssigneeScope(): TaskCreateScope | null {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const { company } = useCompany();
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    const roleId = profile?.role_id ?? profile?.roleId ?? null;
    if (!roleId) {
      setLevel(loading ? null : 1);
      return;
    }
    let cancelled = false;
    void supabase
      .from("company_roles")
      .select("hierarchy_level")
      .eq("id", roleId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLevel(data?.hierarchy_level ?? 1);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, profile?.roleId, profile?.role_id]);

  if (!user?.id || level === null) return null;
  return scopeForPerson({
    level,
    personId: user.id,
    grants: readTaskCreateGrants(company?.template_config),
  });
}
