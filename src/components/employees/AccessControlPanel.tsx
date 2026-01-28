import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/modules/system/components/ErrorState";
import { usePermission } from "@/hooks/usePermission";
import type { Tables } from "@/integrations/supabase/public-types";

type Profile = Tables<"profiles">;

export type EmployeeAccessRole = {
  id: string;
  name: string;
  permissions: string[];
};

type EmployeeAccessResponse = {
  roles: EmployeeAccessRole[];
};

interface AccessControlPanelProps {
  employeeId: string;
  employee?: Profile | null;
}

export function AccessControlPanel({ employeeId }: AccessControlPanelProps) {
  const canManage = usePermission("manage_roles");
  const { data, isLoading, isError, error, refetch } =
    useEmployeeAccess(employeeId);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof Error ? error.message : "Failed to load access data"
        }
        onRetry={refetch}
      />
    );
  }

  if (!data?.roles.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Access Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This team member does not have any roles assigned yet. Assign a role
            to grant system access.
          </p>
          {canManage && <Button onClick={() => refetch()}>Refresh</Button>}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Access Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.roles.map((role) => (
            <AccessCard
              key={role.id}
              title={role.name}
              permissions={role.permissions}
            />
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <div className="flex justify-end">
          <Button type="button" variant="outline">
            Edit Access
          </Button>
        </div>
      )}
    </div>
  );
}

export function useEmployeeAccess(employeeId: string) {
  return useQuery<EmployeeAccessResponse>({
    queryKey: ["employee-access", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      if (!employeeId) {
        return { roles: [] };
      }

      const { data: roleAssignments, error: assignmentsError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", employeeId);

      if (assignmentsError) {
        throw assignmentsError;
      }

      const roleNames = (roleAssignments ?? [])
        .map((assignment) => assignment.role)
        .filter((role): role is "admin" | "manager" | "employee" | "staff" | "supervisor" | "owner" => 
          typeof role === "string" && ["admin", "manager", "employee", "staff", "supervisor", "owner"].includes(role)
        );

      if (!roleNames.length) {
        return { roles: [] };
      }

      const { data: roleDetails, error: rolesError } = await supabase
        .from("company_roles")
        .select("id, name, permissions")
        .in("name", roleNames);

      if (rolesError) {
        throw rolesError;
      }

      const roles: EmployeeAccessRole[] = (roleDetails ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        permissions: extractPermissions(role.permissions),
      }));

      // Ensure we surface roles even if they don't exist in company_roles (fallback)
      const knownNames = new Set(roles.map((role) => role.name.toLowerCase()));
      roleNames.forEach((name) => {
        if (!knownNames.has(name.toLowerCase())) {
          roles.push({
            id: name,
            name: capitalize(name),
            permissions: [],
          });
        }
      });

      return { roles };
    },
  });
}

function AccessCard({
  title,
  permissions,
}: {
  title: string;
  permissions: string[];
}) {
  return (
    <Card className="border border-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {permissions.length ? (
          <div className="flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <Badge key={permission} variant="outline" className="text-xs">
                {formatPermission(permission)}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No individual permissions defined for this role.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function extractPermissions(raw: unknown): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, boolean>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return extractPermissions(parsed);
    } catch {
      return raw.split(",").map((item) => item.trim());
    }
  }

  return [];
}

function formatPermission(permission: string) {
  return permission
    .split(/[_.-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function capitalize(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
