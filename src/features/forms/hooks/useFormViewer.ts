import { useEffect, useMemo, useState } from "react";
import { supabase as browserClient } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import type { FormAccessViewer } from "@/features/forms/utils/formDistribution";

type ViewerExtra = {
  roleName: string | null;
  positionIds: string[];
  departmentId: string | null;
  roles: Array<{ id: string; name: string }>;
};

const EMPTY_EXTRA: ViewerExtra = {
  roleName: null,
  positionIds: [],
  departmentId: null,
  roles: [],
};

export function useFormViewer(): FormAccessViewer {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const [extra, setExtra] = useState<ViewerExtra>(EMPTY_EXTRA);
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const [profileResult, assignmentResult, roleResult] = await Promise.all([
        browserClient
          .from("profiles")
          .select("position_id, department_id, role, role_id")
          .eq("id", userId)
          .maybeSingle(),
        browserClient
          .from("position_assignments")
          .select("position_id, is_active")
          .eq("user_id", userId),
        companyId
          ? browserClient
              .from("company_roles")
              .select("id, name")
              .eq("company_id", companyId)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      const positionIds = new Set<string>();
      if (profileResult.data?.position_id) positionIds.add(profileResult.data.position_id);
      for (const row of assignmentResult.data ?? []) {
        if (row.position_id && row.is_active !== false) positionIds.add(row.position_id);
      }
      setExtra({
        roleName: profileResult.data?.role ?? null,
        positionIds: [...positionIds],
        departmentId: profileResult.data?.department_id ?? null,
        roles: (roleResult.data ?? []).map((role) => ({
          id: role.id,
          name: role.name ?? "",
        })),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, companyId]);

  return useMemo(
    () => ({
      userId,
      roleId: profile?.role_id ?? profile?.roleId ?? null,
      roleName: extra.roleName ?? profile?.role ?? null,
      positionIds: extra.positionIds,
      departmentId: extra.departmentId,
      canManage: can("manageForms") || can("createForms"),
      canSubmit: can("forms.submit"),
      canReadSubmissions:
        can("forms.submissions.read") ||
        can("approveFormSubmissions") ||
        can("manageForms"),
      roles: extra.roles,
    }),
    [
      userId,
      profile?.role_id,
      profile?.roleId,
      profile?.role,
      extra,
      can,
    ],
  );
}
