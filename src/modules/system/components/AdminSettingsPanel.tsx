import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useAdminSettings } from "../hooks/useAdminSettings";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { DEFAULT_ADMIN_CONFIG } from "../hooks/systemSettingsDefaults";

const PLAN_OPTIONS = ["starter", "growth", "enterprise"];

export function AdminSettingsPanel() {
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    state,
    setState,
    dirty,
    saving,
    saveError,
    save,
    reset,
    refreshSnapshot,
    syncing,
    syncError,
  } = useAdminSettings(system);
  const auditLogs = useAuditLogs();

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  const tenant =
    state.tenantManagement ?? DEFAULT_ADMIN_CONFIG.tenantManagement;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tenant management</CardTitle>
          <CardDescription>
            Update ownership, seat allocation, and billing configuration for
            this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tenant-owner">Primary owner email</Label>
            <Input
              id="tenant-owner"
              value={tenant?.primaryOwnerEmail ?? ""}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    primaryOwnerEmail: event.target.value || null,
                  },
                }))
              }
              disabled={!canEdit || loading}
              placeholder="owner@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-plan">Plan</Label>
            <select
              id="tenant-plan"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={tenant?.plan ?? "starter"}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    plan: event.target.value,
                  },
                }))
              }
              disabled={!canEdit || loading}
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-active-seats">Active seats</Label>
            <Input
              id="tenant-active-seats"
              type="number"
              min={0}
              value={tenant?.activeSeats ?? 0}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    activeSeats: Number(event.target.value) || 0,
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-max-seats">Seat limit</Label>
            <Input
              id="tenant-max-seats"
              type="number"
              min={1}
              value={tenant?.maxSeats ?? 10}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  tenantManagement: {
                    ...(prev.tenantManagement ??
                      DEFAULT_ADMIN_CONFIG.tenantManagement),
                    maxSeats:
                      Number(event.target.value) ||
                      (
                        prev.tenantManagement ??
                        DEFAULT_ADMIN_CONFIG.tenantManagement
                      ).maxSeats,
                  },
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Business structure snapshot</CardTitle>
            <CardDescription>
              Sync locations and role templates from live company data for
              downstream governance.
            </CardDescription>
          </div>
          <Button
            onClick={refreshSnapshot}
            disabled={syncing || !canEdit}
            variant="outline"
          >
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh snapshot
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>
              Locations:{" "}
              <Badge variant="outline">
                {state.businessStructure.locations.length}
              </Badge>
            </span>
            <span>
              Departments:{" "}
              <Badge variant="outline">
                {state.businessStructure.departments.length}
              </Badge>
            </span>
            <span>
              Role templates:{" "}
              <Badge variant="outline">{state.roleTemplates.length}</Badge>
            </span>
          </div>
          {syncError && <ErrorState message={syncError.message} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit activity</CardTitle>
          <CardDescription>
            Track privileged configuration changes across the tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditLogs.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit
              history…
            </div>
          ) : auditLogs.error ? (
            <ErrorState message={(auditLogs.error as Error).message} />
          ) : auditLogs.data && auditLogs.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.data.slice(0, 5).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell>
                      {entry.performed_by_profile?.email ??
                        entry.performed_by ??
                        "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No audit events recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {saveError && <ErrorState message={saveError.message} />}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!dirty || saving || !canEdit}
          onClick={reset}
        >
          Discard
        </Button>
        <Button
          onClick={save}
          disabled={!canEdit || !dirty || saving || loading}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
            </>
          ) : (
            "Save admin settings"
          )}
        </Button>
      </div>
    </div>
  );
}
