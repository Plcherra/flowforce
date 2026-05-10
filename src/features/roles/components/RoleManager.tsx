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
  const { roles } = useCompanyRoles();

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole as any })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${userName}'s role updated to ${newRole}`,
      });

      onRoleChange?.(newRole);
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
      supervisor: UserCheck,
      manager: Shield,
      admin: Crown,
      owner: Star,
    };

    const IconComponent = legacyIcons[roleName] || Users;

    return (
      <Badge variant="secondary">
        <div className="flex items-center space-x-1">
          <IconComponent className="h-3 w-3" />
          <span>{roleName}</span>
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
        value={currentRole}
        onValueChange={handleRoleChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.isArray(roles) &&
            roles.map((role) => {
              const IconComponent = getIconComponent(role.icon);
              return (
                <SelectItem
                  key={role.name.toLowerCase()}
                  value={role.name.toLowerCase()}
                >
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
