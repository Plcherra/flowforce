import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompanyRoles, type CompanyRole } from "@/hooks/useCompanyRoles";
import RoleManagementDialog from "./RoleManagementDialog";
import { Plus, Edit, Trash2, Shield, AlertTriangle } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { logger } from "@/utils/logger";

export default function RoleConfigurationTab() {
  const { can } = useCan();
  const { roles, isLoading, createRole, updateRole, deleteRole } =
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

  const handleDeleteRole = async (roleId: string) => {
    if (
      window.confirm(
        "Are you sure you want to deactivate this role? Users with this role will need to be reassigned.",
      )
    ) {
      await deleteRole.mutateAsync(roleId);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Role Configuration</h3>
          <p className="text-gray-600 mt-1">
            Create and manage custom roles with specific permissions for your
            organization
          </p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-4">
        {rolesArray.map((role) => {
          const IconComponent = getIconComponent(role.icon);
          const permissionCount = Object.values(role.permissions).filter(
            Boolean,
          ).length;

          return (
            <Card key={role.id}>
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
                        <h4 className="font-medium text-gray-900">
                          {role.name}
                        </h4>
                        <Badge
                          style={{
                            backgroundColor: role.color + "20",
                            color: role.color,
                            border: `1px solid ${role.color}40`,
                          }}
                        >
                          Level {role.hierarchy_level}
                        </Badge>
                        {role.is_system_role && (
                          <Badge variant="secondary">System Role</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {role.description || "No description provided"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {permissionCount} permissions assigned
                      </p>
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
                    {!role.is_system_role && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {rolesArray.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No roles found
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first custom role to get started
          </p>
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
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
