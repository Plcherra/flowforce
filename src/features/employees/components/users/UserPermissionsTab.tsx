import { useEffect, useMemo, useState } from "react";
import { Shield, RotateCcw, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { useUserPermissionOverrides } from "@/hooks/useUserPermissions";
import { saveEmployeeAccess } from "@/features/employees/utils/saveEmployeeAccess";
import { OperatorAccessGrid } from "@/features/roles/components/OperatorAccessGrid";
import { TaskCreateAccessSection } from "./TaskCreateAccessSection";
import {
  diffsForTaskCreateLevel,
  retainTaskCreateDiffs,
} from "@/features/tasks/utils/taskCreateAccess";
import type { TaskCreateKind } from "@/features/roles/constants/taskCreateKeys";
import type { TaskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";
import {
  applyPermissionDiffsToClassPermissions,
  operatorVerbsToPermissionDiffs,
  permissionDiffsFromRows,
  permissionDiffsToOperatorVerbs,
  retainAllowedDiffs,
  type PermissionDiffMap,
} from "@/features/roles/constants/personAccessDiffs";
import {
  canInviteProductLevel,
  clampPermissionDiffsToInviter,
  inviterCanGrantVerb,
  parseInviteGrantPolicy,
  resolveInviterLevel,
} from "@/features/roles/constants/grantCeiling";
import {
  isInviteableClass,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import {
  getVisibleOperatorAreas,
  isVerbAvailable,
  isVerbLockedOn,
  verbSelectionKey,
  type OperatorVerb,
} from "@/features/roles/constants/operatorBoxes";
import { logger } from "@/utils/logger";

type AccessUser = {
  id: string;
  role_id?: string | null;
};

interface UserPermissionsTabProps {
  user: AccessUser;
}

export function UserPermissionsTab({ user }: UserPermissionsTabProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { roles } = useCompanyRoles();
  const { profile } = useProfile();
  const { company } = useCompany();
  const { permissions: inviterPermissions } = useCan();
  const invitePolicy = parseInviteGrantPolicy(company?.template_config);
  const inviterClass = (Array.isArray(roles) ? roles : []).find(
    (role) => role.id === profile?.role_id,
  );
  const inviterLevel = resolveInviterLevel({
    product_level: inviterClass?.product_level,
    name: inviterClass?.name,
    role: profile?.role,
    hierarchy_level: inviterClass?.hierarchy_level,
  });
  const { data: overrides } = useUserPermissionOverrides(user.id);
  const [isSaving, setIsSaving] = useState(false);

  const inviteableRoles = useMemo(
    () =>
      (Array.isArray(roles) ? roles : []).filter((role) => {
        if (role.id === user.role_id) return true;
        return (
          role.is_active &&
          isInviteableClass(role) &&
          canInviteProductLevel(
            inviterLevel,
            resolveProductLevel(role),
            invitePolicy,
          )
        );
      }),
    [roles, user.role_id, inviterLevel, invitePolicy],
  );

  const [selectedRoleId, setSelectedRoleId] = useState(user.role_id || "");
  const [diffs, setDiffs] = useState<PermissionDiffMap>({});
  const [hasChanges, setHasChanges] = useState(false);

  const selectedRole = inviteableRoles.find((role) => role.id === selectedRoleId);
  const level = selectedRole ? resolveProductLevel(selectedRole) : "staff";
  const canEditAccess =
    inviterLevel === "owner" ||
    canInviteProductLevel(inviterLevel, level, invitePolicy);
  const classPermissions = selectedRole?.permissions ?? {};
  const effectivePermissions = applyPermissionDiffsToClassPermissions(
    level,
    classPermissions,
    diffs,
  );

  useEffect(() => {
    setSelectedRoleId(user.role_id || "");
  }, [user.role_id]);

  useEffect(() => {
    setDiffs(permissionDiffsFromRows(overrides));
    setHasChanges(false);
  }, [overrides]);

  const handleRoleChange = (roleId: string) => {
    const nextRole = inviteableRoles.find((role) => role.id === roleId);
    if (!nextRole) return;
    if (
      inviterLevel !== "owner" &&
      !canInviteProductLevel(
        inviterLevel,
        resolveProductLevel(nextRole),
        invitePolicy,
      )
    ) {
      return;
    }
    setSelectedRoleId(roleId);
    setDiffs(
      retainAllowedDiffs(
        resolveProductLevel(nextRole),
        nextRole.permissions,
        diffs,
      ),
    );
    setHasChanges(true);
  };

  const handleVerbChange = (
    areaKey: string,
    verb: OperatorVerb,
    enabled: boolean,
  ) => {
    const area = getVisibleOperatorAreas(level).find((item) => item.key === areaKey);
    if (!canEditAccess) return;
    if (!area || isVerbLockedOn(area, verb, level)) return;
    if (!isVerbAvailable(area, verb, level)) return;
    if (
      !inviterCanGrantVerb(
        area,
        verb,
        level,
        inviterLevel,
        inviterPermissions,
      )
    ) {
      return;
    }

    const current = permissionDiffsToOperatorVerbs(level, classPermissions, diffs);
    const selection = verbSelectionKey(area.key, verb);
    const next = enabled
      ? Array.from(new Set([...current, selection]))
      : current.filter((key) => key !== selection);

    setDiffs({
      ...operatorVerbsToPermissionDiffs(level, classPermissions, next),
      ...retainTaskCreateDiffs(diffs),
    });
    setHasChanges(true);
  };

  const handleTaskCreateChange = (kind: TaskCreateKind, nextLevel: TaskCreateLevel) => {
    if (!canEditAccess) return;
    setDiffs(diffsForTaskCreateLevel(classPermissions, diffs, kind, nextLevel));
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    setDiffs({});
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!canEditAccess) return;
    setIsSaving(true);
    try {
      await saveEmployeeAccess({
        userId: user.id,
        roleId: selectedRoleId || undefined,
        permissionOverrides: clampPermissionDiffsToInviter(
          level,
          diffs,
          inviterLevel,
          inviterPermissions,
        ),
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["user-permission-overrides", user.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["user-effective-permissions", user.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["profiles"] }),
      ]);
      setHasChanges(false);
      toast({
        title: "Access saved",
        description: "Class and give/take changes are on this person.",
      });
    } catch (error) {
      logger.error("Error saving changes:", { error, tags: ["error"] });
      toast({
        title: "Unable to save access",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Class
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Select
                value={selectedRoleId}
                onValueChange={handleRoleChange}
                disabled={!canEditAccess}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {inviteableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              disabled={!hasChanges}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to class
            </Button>
          </div>
          {selectedRole ? (
            <p className="text-sm text-muted-foreground">
              {canEditAccess
                ? `${selectedRole.name} paints the boxes. Give or take only what you can grant.`
                : `${selectedRole.name} is above what you can grant. You can look, not change.`}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRole ? (
            <TaskCreateAccessSection
              classPermissions={classPermissions}
              diffs={diffs}
              disabled={!canEditAccess}
              onChange={handleTaskCreateChange}
            />
          ) : null}
          {selectedRole ? (
            <OperatorAccessGrid
              level={level}
              permissions={effectivePermissions}
              classPermissions={classPermissions}
              inviterLevel={inviterLevel}
              inviterPermissions={inviterPermissions}
              disabled={!canEditAccess}
              idPrefix={`user-${user.id}`}
              onVerbChange={handleVerbChange}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a class to paint this person&apos;s access.
            </p>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={
                !canEditAccess || !hasChanges || isSaving
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
