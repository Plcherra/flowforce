import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
import { getPlantedSystemRoles } from "@/features/roles/constants/productRoles";
import {
  canDeactivateClass,
  clampPermissionsToProductLevel,
  cloneClassFromProductLevel,
  isCloneableProductLevel,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import { PRODUCT_ROLE_LABELS } from "@/features/roles/constants/productRoles";
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Shield,
  Crown,
  UserCheck,
  Star,
  Settings,
  Eye,
} from "lucide-react";
import RoleManagementDialog from "@/features/roles/components/RoleManagementDialog";
import { ClassJobBoxList } from "@/features/roles/components/ClassJobBoxList";
import type { CompanyRole } from "@/hooks/useCompanyRoles";

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  product_level?: "owner" | "admin" | "manager" | "staff";
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  is_active?: boolean;
}

function toCompanyRole(role: OnboardingRole): CompanyRole {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    color: role.color,
    icon: role.icon,
    hierarchy_level: role.hierarchy_level,
    product_level: resolveProductLevel(role),
    permissions: role.permissions,
    is_system_role: role.is_system_role,
    is_active: role.is_active !== false,
  };
}

interface OnboardingRoleManagerProps {
  selectedTemplate: BusinessTemplate;
  roles: OnboardingRole[];
  positions: OnboardingPosition[];
  onRolesChange: (roles: OnboardingRole[]) => void;
  onPositionsChange: (positions: OnboardingPosition[]) => void;
}

const AVAILABLE_ICONS = [
  { value: "Users", label: "Users", icon: Users },
  { value: "UserCheck", label: "User Check", icon: UserCheck },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Crown", label: "Crown", icon: Crown },
  { value: "Star", label: "Star", icon: Star },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "Eye", label: "Eye", icon: Eye },
];

export default function OnboardingRoleManager({
  roles,
  onRolesChange,
}: OnboardingRoleManagerProps) {
  const [editingRole, setEditingRole] = useState<OnboardingRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);

  useEffect(() => {
    if (roles.length === 0) {
      onRolesChange(getPlantedSystemRoles());
    }
  }, [roles.length, onRolesChange]);

  const planted = roles.length > 0 ? roles : getPlantedSystemRoles();

  const handleAddRole = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const handleEditRole = (role: OnboardingRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    const target = planted.find((role) => role.id === roleId);
    if (target && !canDeactivateClass(target)) {
      return;
    }
    if (target?.is_system_role) {
      onRolesChange(
        planted.map((role) =>
          role.id === roleId ? { ...role, is_active: false } : role,
        ),
      );
      return;
    }
    onRolesChange(planted.filter((role) => role.id !== roleId));
  };

  const handleRestoreRole = (roleId: string) => {
    onRolesChange(
      planted.map((role) =>
        role.id === roleId ? { ...role, is_active: true } : role,
      ),
    );
  };

  const handleSaveRole = (roleData: Partial<OnboardingRole>) => {
    if (editingRole) {
      const productLevel = resolveProductLevel({
        ...editingRole,
        ...roleData,
      });
      onRolesChange(
        planted.map((role) =>
          role.id === editingRole.id
            ? {
                ...role,
                ...roleData,
                product_level: productLevel,
                permissions: clampPermissionsToProductLevel(
                  productLevel,
                  roleData.permissions ?? role.permissions,
                ),
              }
            : role,
        ),
      );
    } else {
      const productLevel = isCloneableProductLevel(roleData.product_level)
        ? roleData.product_level
        : "manager";
      const cloned = cloneClassFromProductLevel(
        productLevel,
        roleData.name || "New class",
      );
      const newRole: OnboardingRole = {
        id: `custom-${Date.now()}`,
        name: roleData.name || cloned.name || "New class",
        description: roleData.description || cloned.description,
        color: roleData.color || cloned.color,
        icon: roleData.icon || cloned.icon,
        hierarchy_level: cloned.hierarchy_level,
        product_level: productLevel,
        permissions: clampPermissionsToProductLevel(
          productLevel,
          roleData.permissions || cloned.permissions,
        ),
                        is_system_role: false,
                        is_active: true,
                      };
      onRolesChange([...planted, newRole]);
    }
    setDialogOpen(false);
    setEditingRole(null);
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find((i) => i.value === iconName);
    return iconConfig?.icon || Users;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Classes</h3>
          <p className="mt-1 text-gray-600">
            These four system roles are ready. Continue, or open roles to give
            or take access.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={rolesOpen ? "secondary" : "default"}
            onClick={() => setRolesOpen((open) => !open)}
          >
            {rolesOpen ? "Done editing" : "Open roles"}
          </Button>
          {rolesOpen && (
            <Button onClick={handleAddRole}>
              <Plus className="mr-2 h-4 w-4" />
              Create class
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {planted.map((role) => {
          const IconComponent = getIconComponent(role.icon);
          const productLevel = resolveProductLevel(role);

          return (
            <Card key={role.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="rounded-lg p-2"
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
                          {PRODUCT_ROLE_LABELS[productLevel]} level
                        </Badge>
                        {role.is_system_role && (
                          <Badge variant="secondary">System</Badge>
                        )}
                        {role.is_active === false && (
                          <Badge variant="outline">Archived</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {role.description || "No description provided"}
                      </p>
                      <ClassJobBoxList
                        level={productLevel}
                        permissions={role.permissions}
                      />
                    </div>
                  </div>

                  {rolesOpen && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      {role.is_active === false ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreRole(role.id)}
                        >
                          Restore
                        </Button>
                      ) : canDeactivateClass(role) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          {role.is_system_role ? "Archive" : "Delete"}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RoleManagementDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRole(null);
        }}
        role={editingRole ? toCompanyRole(editingRole) : undefined}
        onSave={handleSaveRole}
      />
    </div>
  );
}
