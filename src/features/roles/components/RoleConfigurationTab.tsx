import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyRoles, type CompanyRole } from "@/hooks/useCompanyRoles";
import {
  parseInviteGrantPolicy,
  withInviteGrantPolicy,
} from "@/features/roles/constants/grantCeiling";
import type { CompanyConfig } from "@/types/common";
import {
  canDeactivateClass,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import { PRODUCT_ROLE_LABELS } from "@/features/roles/constants/productRoles";
import RoleManagementDialog from "./RoleManagementDialog";
import { ClassJobBoxList } from "./ClassJobBoxList";
import { Plus, Edit, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { logger } from "@/utils/logger";

export default function RoleConfigurationTab() {
  const { can } = useCan();
  const { company, updateCompany } = useCompany();
  const invitePolicy = parseInviteGrantPolicy(company?.template_config);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const { roles, isLoading, createRole, updateRole, deleteRole, restoreRole } =
    useCompanyRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyRole | undefined>();

  const handleCreateRole = () => {
    setEditingRole(undefined);
    setDialogOpen(true);
  };

  const handleEditRole = (role: CompanyRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleSaveRole = async (data: any) => {
    try {
      if (editingRole) {
        await updateRole.mutateAsync({ id: editingRole.id, ...data });
      } else {
        await createRole.mutateAsync(data);
      }
      setDialogOpen(false);
      setEditingRole(undefined);
    } catch (error) {
      logger.error("Failed to save role:", { error, tags: ["error"] });
    }
  };

  const handleDeleteRole = async (role: CompanyRole) => {
    if (!canDeactivateClass(role)) {
      return;
    }
    if (
      window.confirm(
        "Archive this class? It drops off invite and the Roles list. The row stays so FlowForce will not plant a stock copy.",
      )
    ) {
      await deleteRole.mutateAsync(role.id);
    }
  };

  const handleRestoreRole = async (role: CompanyRole) => {
    await restoreRole.mutateAsync(role.id);
  };

  const handleInvitePolicyChange = async (managerCanInviteManagers: boolean) => {
    if (!company) return;
    setSavingPolicy(true);
    try {
      await updateCompany({
        template_config: withInviteGrantPolicy(company.template_config, {
          managerCanInviteManagers,
        }) as CompanyConfig,
      });
    } catch (error) {
      logger.error("Failed to save invite grant setting", {
        error,
        tags: ["error"],
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    // Simple mapping for now - in a real app you'd have a more robust icon system
    switch (iconName) {
      case "Shield":
        return Shield;
      default:
        return Shield;
    }
  };

  if (!can("systemSettings")) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Denied
        </h3>
        <p className="text-sm text-gray-500">
          You don&apos;t have permission to manage roles.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading roles...</div>;
  }

  const rolesArray = Array.isArray(roles) ? roles : [];
  const activeRoles = rolesArray.filter((role) => role.is_active !== false);
  const archivedRoles = rolesArray.filter((role) => role.is_active === false);

  const renderRoleCard = (role: CompanyRole) => {
    const IconComponent = getIconComponent(role.icon);
    const productLevel = resolveProductLevel(role);

    return (
      <Card key={role.id} className={role.is_active === false ? "opacity-80" : undefined}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: role.color + "20" }}
              >
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: role.color }}
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{role.name}</h4>
                  <Badge
                    style={{
                      backgroundColor: role.color + "20",
                      color: role.color,
                      border: `1px solid ${role.color}40`,
                    }}
                  >
                    {PRODUCT_ROLE_LABELS[productLevel]} level
                  </Badge>
                  {role.is_system_role && (
                    <Badge variant="secondary">System Role</Badge>
                  )}
                  {role.is_active === false && (
                    <Badge variant="outline">Archived</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {role.description || "No description provided"}
                </p>
                <ClassJobBoxList
                  level={productLevel}
                  permissions={role.permissions}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditRole(role)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {role.is_active === false ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreRole(role)}
                >
                  Restore
                </Button>
              ) : canDeactivateClass(role) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRole(role)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Archive
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Role Configuration</h3>
          <p className="text-gray-600 mt-1">
            Plant classes on a locked level, then give or take See, Edit, and
            Create / delete. Archive Admin, Manager, or Staff to hide them.
            Owner stays.
          </p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="h-4 w-4 mr-2" />
          Create class
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="space-y-1">
            <Label htmlFor="manager-invite-managers">
              Managers can invite Manager-level classes
            </Label>
            <p className="text-sm text-muted-foreground">
              Leave this on so a GM can invite Kitchen manager. Turn it off if
              managers should only invite Staff. They still cannot grant Admin
              or billing.
            </p>
          </div>
          <Switch
            id="manager-invite-managers"
            checked={invitePolicy.managerCanInviteManagers}
            disabled={savingPolicy || !company}
            onCheckedChange={handleInvitePolicyChange}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">{activeRoles.map(renderRoleCard)}</div>

      {archivedRoles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Archived classes
          </h4>
          <div className="grid gap-4">{archivedRoles.map(renderRoleCard)}</div>
        </div>
      )}

      {rolesArray.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No roles found
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first class to get started
          </p>
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create class
          </Button>
        </div>
      )}

      <RoleManagementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        onSave={handleSaveRole}
        isLoading={createRole.isPending || updateRole.isPending}
      />
    </div>
  );
}
