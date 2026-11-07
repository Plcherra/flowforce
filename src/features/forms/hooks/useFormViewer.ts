import { useEffect, useMemo, useState } from "react";
import { supabase as browserClient } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import type { FormAccessViewer } from "@/features/forms/utils/formDistribution";
import { roleIdsScheduledOnDay } from "@/features/tasks/utils/scheduledRoleLists";

type ViewerExtra = {
  roleName: string | null;
  positionIds: string[];
  departmentId: string | null;
  roles: Array<{ id: string; name: string }>;
  scheduledRoleIds: string[];
};

const EMPTY_EXTRA: ViewerExtra = {
  roleName: null,
  positionIds: [],
  departmentId: null,
  roles: [],
  scheduledRoleIds: [],
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
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - 1);
      const dayEnd = new Date();
      dayEnd.setHours(0, 0, 0, 0);
      dayEnd.setDate(dayEnd.getDate() + 2);
      const [profileResult, assignmentResult, roleResult, positionResult, scheduleResult] =
        await Promise.all([
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
        companyId
          ? browserClient
              .from("positions")
              .select("id, name, role_id")
              .eq("company_id", companyId)
          : Promise.resolve({ data: [], error: null }),
        companyId
          ? browserClient
              .from("schedules")
              .select("role, position_id, start_time, end_time, user_id, is_published, is_template")
              .eq("company_id", companyId)
              .eq("user_id", userId)
              .gte("start_time", dayStart.toISOString())
              .lt("start_time", dayEnd.toISOString())
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      const positionIds = new Set<string>();
      if (profileResult.data?.position_id) positionIds.add(profileResult.data.position_id);
      for (const row of assignmentResult.data ?? []) {
        if (row.position_id && row.is_active !== false) positionIds.add(row.position_id);
      }
      const roles = (roleResult.data ?? []).map((role) => ({
        id: role.id,
        name: role.name ?? "",
      }));
      const positions = (positionResult.data ?? []).map((position) => ({
        id: position.id,
        name: position.name ?? "",
        roleId: position.role_id,
      }));
      setExtra({
        roleName: profileResult.data?.role ?? null,
        positionIds: [...positionIds],
        departmentId: profileResult.data?.department_id ?? null,
        roles,
        scheduledRoleIds: roleIdsScheduledOnDay({
          schedules: scheduleResult.data ?? [],
          viewerId: userId,
          now: new Date(),
          roles,
          positions,
        }),
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
      scheduledRoleIds: extra.scheduledRoleIds,
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
