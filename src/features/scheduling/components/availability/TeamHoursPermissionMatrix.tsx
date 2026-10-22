import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import type { PermissionKey } from "@/lib/permissions/registry";

const SCHEDULE_KEYS = [
  { key: "viewOwnSchedules", label: "Own schedule" },
  { key: "viewTeamSchedules", label: "Team schedule" },
  { key: "schedule.view", label: "Published grid" },
  { key: "editSchedules", label: "Draft weeks" },
  { key: "schedule.edit", label: "Create and assign shifts" },
] as const satisfies ReadonlyArray<{ key: PermissionKey; label: string }>;

type ScheduleKey = (typeof SCHEDULE_KEYS)[number]["key"];

interface PersonRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string | null;
}

interface TeamHoursPermissionMatrixProps {
  orgId: string;
}

export function TeamHoursPermissionMatrix({
  orgId,
}: TeamHoursPermissionMatrixProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { can, isLoading: permissionLoading } = useCan();
  const queryClient = useQueryClient();
  const canGrant = can("schedule.grant");

  const matrixQuery = useQuery({
    queryKey: ["team-hours-permission-matrix", orgId],
    enabled: Boolean(orgId) && canGrant && !permissionLoading,
    queryFn: async () => {
      const { data: people, error: peopleError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role_id")
        .eq("company_id", orgId)
        .order("first_name", { ascending: true });
      if (peopleError) throw peopleError;

      const rows = (people ?? []) as PersonRow[];
      const roleIds = Array.from(
        new Set(rows.map((person) => person.role_id).filter(Boolean)),
      ) as string[];
      const userIds = rows.map((person) => person.id);

      const rolesResult =
        roleIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("company_roles")
              .select("id, permissions")
              .in("id", roleIds);
      if (rolesResult.error) throw rolesResult.error;

      const overridesResult =
        userIds.length === 0
          ? { data: [], error: null }
          : await supabase
              .from("user_permissions")
              .select("user_id, permission_key, permission_value")
              .in("user_id", userIds)
              .in(
                "permission_key",
                SCHEDULE_KEYS.map((entry) => entry.key),
              );
      if (overridesResult.error) throw overridesResult.error;

      return {
        people: rows,
        roles: rolesResult.data ?? [],
        overrides: overridesResult.data ?? [],
      };
    },
  });

  const savePermission = useMutation({
    mutationFn: async ({
      userId,
      key,
      enabled,
    }: {
      userId: string;
      key: ScheduleKey;
      enabled: boolean;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("user_permissions").upsert(
        {
          user_id: userId,
          permission_key: key,
          permission_value: enabled ? "allow" : "deny",
          created_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,permission_key" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({
        title: "Schedule permission saved",
        description: "Reload shows the same schedule permissions.",
      });
      await queryClient.invalidateQueries({
        queryKey: ["team-hours-permission-matrix", orgId],
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to save schedule permission",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  if (permissionLoading || !canGrant) return null;

  const rolePermissions = new Map<string, Record<string, boolean>>();
  for (const role of matrixQuery.data?.roles ?? []) {
    const permissions =
      role.permissions && typeof role.permissions === "object"
        ? (role.permissions as Record<string, boolean>)
        : {};
    rolePermissions.set(role.id, permissions);
  }

  const overrideValue = (userId: string, key: ScheduleKey) =>
    matrixQuery.data?.overrides.find(
      (override) =>
        override.user_id === userId && override.permission_key === key,
    )?.permission_value;

  const isEnabled = (person: PersonRow, key: ScheduleKey) => {
    const override = overrideValue(person.id, key);
    if (override === "deny") return false;
    if (override === "allow") return true;
    const role = person.role_id ? rolePermissions.get(person.role_id) : undefined;
    return Boolean(role?.[key]);
  };

  return (
    <section
      data-testid="team-hours-permission-matrix"
      className="space-y-3 rounded-lg border bg-background p-4"
    >
      <div>
        <h3 className="text-lg font-semibold">{t("schedule.schedulePermissions")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("schedule.turnSchedulePermissionsOnOrOffForSomeone")}
        </p>
      </div>
      {matrixQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("schedule.loadingPeople")}</p>
      ) : (
        <div className="space-y-3">
          {(matrixQuery.data?.people ?? []).map((person) => {
            const name =
              `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
              "Unnamed";
            return (
              <div
                key={person.id}
                data-testid={`schedule-permission-person-${person.id}`}
                className="rounded-md border p-3"
              >
                <p className="mb-2 text-sm font-medium">{name}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SCHEDULE_KEYS.map((entry) => {
                    const checked = isEnabled(person, entry.key);
                    return (
                      <label
                        key={entry.key}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={savePermission.isPending}
                          data-testid={`schedule-permission-${person.id}-${entry.key}`}
                          onCheckedChange={(value) =>
                            savePermission.mutate({
                              userId: person.id,
                              key: entry.key,
                              enabled: value === true,
                            })
                          }
                        />
                        {entry.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
