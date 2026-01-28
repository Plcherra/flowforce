import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
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
  Briefcase,
} from "lucide-react";
import PositionManager from "./PositionManager";

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface OnboardingRoleManagerProps {
  selectedTemplate: BusinessTemplate;
  roles: OnboardingRole[];
  positions: OnboardingPosition[];
  onRolesChange: (roles: OnboardingRole[]) => void;
  onPositionsChange: (positions: OnboardingPosition[]) => void;
}

const DEFAULT_ROLES: OnboardingRole[] = [
  {
    id: "employee",
    name: "Employee",
    description: "Basic employee with standard access",
    color: "#3b82f6",
    icon: "Users",
    hierarchy_level: 1,
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewOwnSchedules: true,
      viewOwnTasks: true,
      viewOwnExpenses: true,
    },
    is_system_role: true,
  },
  {
    id: "supervisor",
    name: "Supervisor",
    description: "Team supervisor with team management capabilities",
    color: "#059669",
    icon: "UserCheck",
    hierarchy_level: 2,
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewTeamProfiles: true,
      viewOwnSchedules: true,
      viewTeamSchedules: true,
      editSchedules: true,
      viewOwnTasks: true,
      viewTeamTasks: true,
      editTasks: true,
      viewOwnExpenses: true,
      viewTeamExpenses: true,
      approveExpenses: true,
      approveTimeOff: true,
    },
    is_system_role: false,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Department manager with broader access",
    color: "#dc2626",
    icon: "Shield",
    hierarchy_level: 3,
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewTeamProfiles: true,
      editTeamProfiles: true,
      viewOwnSchedules: true,
      viewTeamSchedules: true,
      editSchedules: true,
      viewOwnTasks: true,
      viewTeamTasks: true,
      editTasks: true,
      viewOwnExpenses: true,
      viewTeamExpenses: true,
      approveExpenses: true,
      approveTimeOff: true,
      createForms: true,
      manageForms: true,
      approveFormSubmissions: true,
      viewAIInsights: true,
      manageInventory: true,
      managePayments: true,
    },
    is_system_role: false,
  },
  {
    id: "admin",
    name: "Administrator",
    description: "System administrator with full access",
    color: "#7c3aed",
    icon: "Crown",
    hierarchy_level: 4,
    permissions: {
      viewOwnProfile: true,
      editOwnProfile: true,
      viewTeamProfiles: true,
      editTeamProfiles: true,
      viewOwnSchedules: true,
      viewTeamSchedules: true,
      editSchedules: true,
      viewOwnTasks: true,
      viewTeamTasks: true,
      editTasks: true,
      viewOwnExpenses: true,
      viewTeamExpenses: true,
      approveExpenses: true,
      approveTimeOff: true,
      manageUsers: true,
      systemSettings: true,
      createForms: true,
      manageForms: true,
      approveFormSubmissions: true,
      managePositions: true,
      viewAIInsights: true,
      manageInventory: true,
      managePayments: true,
    },
    is_system_role: false,
  },
];

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
  selectedTemplate,
  roles,
  positions,
  onRolesChange,
  onPositionsChange,
}: OnboardingRoleManagerProps) {
  const [editingRole, setEditingRole] = useState<OnboardingRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [positionManagerOpen, setPositionManagerOpen] = useState(false);
  const [selectedRoleForPositions, setSelectedRoleForPositions] =
    useState<OnboardingRole | null>(null);

  useEffect(() => {
    if (roles.length === 0) {
      onRolesChange(DEFAULT_ROLES);
    }
  }, [roles.length, onRolesChange]);

  const handleAddRole = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const handleEditRole = (role: OnboardingRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (roles.length <= 4) {
      alert("You must have at least 4 roles");
      return;
    }
    onRolesChange(roles.filter((role) => role.id !== roleId));
    // Also remove positions for this role
    onPositionsChange(
      positions.filter((position) => position.roleId !== roleId),
    );
  };

  const handleSaveRole = (roleData: Partial<OnboardingRole>) => {
    if (editingRole) {
      // Update existing role
      onRolesChange(
        roles.map((role) =>
          role.id === editingRole.id ? { ...role, ...roleData } : role,
        ),
      );
    } else {
      // Add new role
      const newRole: OnboardingRole = {
        id: `custom-${Date.now()}`,
        name: roleData.name || "New Role",
        description: roleData.description || "",
        color: roleData.color || "#3b82f6",
        icon: roleData.icon || "Users",
        hierarchy_level: roleData.hierarchy_level || 1,
        permissions: roleData.permissions || {},
        is_system_role: false,
      };
      onRolesChange([...roles, newRole]);
    }
    setDialogOpen(false);
    setEditingRole(null);
  };

  const handleManagePositions = (role: OnboardingRole) => {
    setSelectedRoleForPositions(role);
    setPositionManagerOpen(true);
  };

  const handlePositionsChange = (
    roleId: string,
    updatedPositions: OnboardingPosition[],
  ) => {
    onPositionsChange(updatedPositions);
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find((i) => i.value === iconName);
    return iconConfig?.icon || Users;
  };

  const getRolePositionCount = (roleId: string) => {
    return positions.filter((p) => p.roleId === roleId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Company Roles & Positions</h3>
          <p className="text-gray-600 mt-1">
            Define the roles for your organization and add specific positions
            within each role. You need at least 4 roles.
          </p>
        </div>
        <Button onClick={handleAddRole}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid gap-4">
        {roles.map((role) => {
          const IconComponent = getIconComponent(role.icon);
          const permissionCount = Object.values(role.permissions).filter(
            Boolean,
          ).length;
          const positionCount = getRolePositionCount(role.id);

          return (
            <Card key={role.id}>
              <CardContent className="p-4">
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
                          <Badge variant="secondary">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {role.description || "No description provided"}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500">
                          {permissionCount} permissions
                        </p>
                        <p className="text-xs text-gray-500">
                          {positionCount} positions
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManagePositions(role)}
                    >
                      <Briefcase className="h-4 w-4 mr-1" />
                      Positions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRole(role)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!role.is_system_role && roles.length > 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RoleEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        onSave={handleSaveRole}
      />

      {selectedRoleForPositions && (
        <PositionManager
          role={selectedRoleForPositions}
          positions={positions}
          selectedTemplate={selectedTemplate}
          onPositionsChange={handlePositionsChange}
          open={positionManagerOpen}
          onOpenChange={setPositionManagerOpen}
        />
      )}
    </div>
  );
}

interface RoleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: OnboardingRole | null;
  onSave: (data: Partial<OnboardingRole>) => void;
}

function RoleEditDialog({
  open,
  onOpenChange,
  role,
  onSave,
}: RoleEditDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    icon: "Users",
    hierarchy_level: 1,
  });

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
        color: role.color,
        icon: role.icon,
        hierarchy_level: role.hierarchy_level,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6",
        icon: "Users",
        hierarchy_level: 1,
      });
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find((i) => i.value === iconName);
    return iconConfig?.icon || Users;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Edit Role" : "Create New Role"}</DialogTitle>
          <DialogDescription>Configure the role settings</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter role name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hierarchy">Hierarchy Level</Label>
              <Input
                id="hierarchy"
                type="number"
                min="1"
                max="10"
                value={formData.hierarchy_level}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    hierarchy_level: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe this role's responsibilities"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-16 h-10"
                />
                <Badge
                  style={{ backgroundColor: formData.color, color: "white" }}
                >
                  Preview
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, icon: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const IconComponent = getIconComponent(formData.icon);
                        return <IconComponent className="h-4 w-4" />;
                      })()}
                      <span>{formData.icon}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((iconOption) => {
                    const IconComponent = iconOption.icon;
                    return (
                      <SelectItem
                        key={iconOption.value}
                        value={iconOption.value}
                      >
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <span>{iconOption.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {role ? "Update Role" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
