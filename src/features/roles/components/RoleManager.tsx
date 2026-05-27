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
import { supabase } from "@/integrations/supabase/client";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";
import {
  normalizeProductRoleKey,
  PRODUCT_ROLE_KEYS,
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
  const normalizedCurrentRole =
    normalizeProductRoleKey(currentRole) ?? currentRole.toLowerCase();
  const roleOptions = PRODUCT_ROLE_KEYS.map((roleKey) => ({
    key: roleKey,
    label: PRODUCT_ROLE_LABELS[roleKey],
    dbRole: Array.isArray(roles)
      ? roles.find((role) => normalizeProductRoleKey(role.name) === roleKey)
      : undefined,
  }));

  const handleRoleChange = async (newRole: string) => {
    const normalizedRole = normalizeProductRoleKey(newRole);
    if (!normalizedRole || normalizedRole === normalizedCurrentRole) return;
    const selectedRole = roleOptions.find(
      (role) => role.key === normalizedRole,
    );
    if (!selectedRole?.dbRole) {
      toast({
        title: "Role not available",
        description: "The selected role preset is still loading.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { data: targetProfile, error: targetProfileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();

      if (targetProfileError) throw targetProfileError;

      const previousRole = normalizedCurrentRole;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: normalizedRole,
          role_id: selectedRole.dbRole.id,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      if (targetProfile?.company_id) {
        const { error: membershipError } = await supabase
          .from("company_members")
          .update({ role: normalizedRole })
          .eq("company_id", targetProfile.company_id)
          .eq("user_id", userId);

        if (membershipError) throw membershipError;
      }

      await logAuditEvent({
        targetUserId: userId,
        action: AUDIT_ACTIONS.userRoleUpdated,
        tableName: "profiles",
        recordId: userId,
        oldValues: { role: previousRole },
        newValues: {
          role: normalizedRole,
          role_id: selectedRole.dbRole.id,
        },
      });

      toast({
        title: "Success",
        description: `${userName}'s role updated to ${PRODUCT_ROLE_LABELS[normalizedRole]}`,
      });

      onRoleChange?.(normalizedRole);
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
        <span className="text-sm text-gray-600">Current Role:</span>
        {getRoleBadge(currentRole)}
      </div>

      <Select
        value={normalizedCurrentRole}
        onValueChange={handleRoleChange}
        disabled={isUpdating || rolesLoading}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleOptions.map((role) => {
            const IconComponent = getIconComponent(
              role.dbRole?.icon ?? "Users",
            );
            return (
              <SelectItem key={role.key} value={role.key}>
                <div className="flex items-center space-x-2">
                  <IconComponent
                    className="h-3 w-3"
                    style={{ color: role.dbRole?.color }}
                  />
                  <span>{role.label}</span>
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
