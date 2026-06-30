import { useMemo } from "react";
import type { Tables } from "@/integrations/supabase/public-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles } from "lucide-react";
import { useRoles, useAssignRole } from "@/hooks/useRoles";
import { useEmployeeAccess } from "./AccessControlPanel";
import { useCopilotSuggestion } from "@/hooks/useCopilotSuggestions";

type Profile = Tables<"profiles">;

interface RoleConfigPanelProps {
  employeeId: string;
  employee?: Profile | null;
}

export function RoleConfigPanel({
  employeeId,
  employee,
}: RoleConfigPanelProps) {
  const { data: roles = [], isLoading } = useRoles();
  const assignRole = useAssignRole();
  const { data: access } = useEmployeeAccess(employeeId);

  const handleAssignRole = (roleId: string) => {
    if (!roleId) return;
    assignRole.mutate({ employeeId, roleId });
  };

  const availableRoleOptions = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id,
        name: role.name,
      })),
    [roles],
  );

  const suggestions = useCopilotSuggestion("employee_management", {
    context: {
      role: employee?.role,
      department: employee?.departmentid,
      availableRoles: availableRoleOptions,
    },
    onAccept: (suggestion) => {
      if (suggestion.roleId) {
        handleAssignRole(suggestion.roleId);
      }
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Role Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Assign a new role to update this teammate&apos;s access.
            </p>
          </div>

          <Select
            onValueChange={handleAssignRole}
            disabled={isLoading || assignRole.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign new role" />
            </SelectTrigger>
            <SelectContent>
              {availableRoleOptions.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {assignRole.isPending && (
            <p className="text-sm text-muted-foreground">Updating role…</p>
          )}
        </CardContent>
      </Card>

      {suggestions.items.length > 0 && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Copilot Suggestions</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {suggestions.items.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => suggestions.accept(item)}
                disabled={assignRole.isPending}
              >
                {item.message}
              </Button>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <PermissionsMatrix roles={access?.roles ?? []} />
    </div>
  );
}

function PermissionsMatrix({
  roles,
}: {
  roles: Array<{ id: string; name: string; permissions: string[] }>;
}) {
  const uniquePermissions = useMemo(() => {
    const permissionSet = new Set<string>();
    roles.forEach((role) => {
      role.permissions.forEach((permission) => permissionSet.add(permission));
    });
    return Array.from(permissionSet).sort();
  }, [roles]);

  if (!roles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Assign a role to preview the permissions that will apply to this
            teammate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Assigned Roles
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roles.map((role) => (
              <Badge key={role.id} variant="secondary">
                {role.name}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Effective Permissions
          </p>
          {uniquePermissions.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {uniquePermissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {formatPermission(permission)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              The assigned roles do not grant any additional permissions.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatPermission(permission: string) {
  return permission
    .split(/[_.-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
