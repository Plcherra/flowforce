import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { saveEmployeeAccess } from "@/features/employees/utils/saveEmployeeAccess";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";
import { isInviteableClass } from "../constants/productLevels";
import {
  normalizeProductRoleKey,
  PRODUCT_ROLE_LABELS,
} from "../constants/productRoles";
import { Shield, Crown, Users, UserCheck, Star } from "lucide-react";

interface RoleManagerProps {
  userId: string;
  currentRole: string;
  userName: string;
  onRoleChange?: (newRole: string) => void;
}

export default function RoleManager({
  userId,
  currentRole,
  userName,
  onRoleChange,
}: RoleManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { roles, loading: rolesLoading } = useCompanyRoles();
  const classOptions = (Array.isArray(roles) ? roles : []).filter(
    (role) => role.is_active && (isInviteableClass(role) || role.name === currentRole),
  );
  const currentClass =
    classOptions.find(
      (role) => role.name.toLowerCase() === currentRole.toLowerCase(),
    ) ??
    classOptions.find(
      (role) => normalizeProductRoleKey(role.name) === normalizeProductRoleKey(currentRole),
    );
  const normalizedCurrentRole =
    normalizeProductRoleKey(currentRole) ?? currentRole.toLowerCase();

  const handleRoleChange = async (roleId: string) => {
    const selectedRole = classOptions.find((role) => role.id === roleId);
    if (!selectedRole || selectedRole.id === currentClass?.id) return;

    setIsUpdating(true);
    try {
      await saveEmployeeAccess({ userId, roleId: selectedRole.id });

      await logAuditEvent({
        targetUserId: userId,
        action: AUDIT_ACTIONS.userRoleUpdated,
        tableName: "profiles",
        recordId: userId,
        oldValues: { role: currentRole, role_id: currentClass?.id ?? null },
        newValues: {
          role: selectedRole.name,
          role_id: selectedRole.id,
        },
      });

      toast({
        title: "Success",
        description: `${userName}'s class is now ${selectedRole.name}`,
      });

      onRoleChange?.(selectedRole.name);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to update role: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRoleBadge = (roleName: string) => {
    const normalizedRole = normalizeProductRoleKey(roleName);
    const role = Array.isArray(roles)
      ? roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase())
      : undefined;

    if (role) {
      return (
        <Badge
          style={{ backgroundColor: role.color + "20", color: role.color }}
        >
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>{role.name}</span>
          </div>
        </Badge>
      );
    }

    // Fallback for legacy roles
    const legacyIcons: Record<string, any> = {
      staff: Users,
      manager: Shield,
      admin: Crown,
      owner: Star,
    };

    const IconComponent = legacyIcons[normalizedRole ?? roleName] || Users;

    return (
      <Badge variant="secondary">
        <div className="flex items-center space-x-1">
          <IconComponent className="h-3 w-3" />
          <span>
            {normalizedRole ? PRODUCT_ROLE_LABELS[normalizedRole] : roleName}
          </span>
        </div>
      </Badge>
    );
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "Users":
        return Users;
      case "UserCheck":
        return UserCheck;
      case "Shield":
        return Shield;
      case "Crown":
        return Crown;
      case "Star":
        return Star;
      default:
        return Users;
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Current Role:</span>
        {getRoleBadge(currentRole)}
      </div>

      <Select
        value={currentClass?.id ?? ""}
        onValueChange={handleRoleChange}
        disabled={isUpdating || rolesLoading}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {classOptions.map((role) => {
            const IconComponent = getIconComponent(role.icon ?? "Users");
            return (
              <SelectItem key={role.id} value={role.id}>
                <div className="flex items-center space-x-2">
                  <IconComponent
                    className="h-3 w-3"
                    style={{ color: role.color }}
                  />
                  <span>{role.name}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {isUpdating && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      )}
    </div>
  );
}
