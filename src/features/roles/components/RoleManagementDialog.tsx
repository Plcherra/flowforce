import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type CompanyRole, type CreateRoleData } from "@/hooks/useCompanyRoles";
import { findAccessSwitch } from "@/features/roles/constants/permissionAccessTypes";
import { OperatorAccessGrid } from "./OperatorAccessGrid";
import {
  CLONEABLE_PRODUCT_LEVELS,
  clampPermissionsToProductLevel,
  cloneClassFromProductLevel,
  isCloneableProductLevel,
  permissionAllowedAtLevel,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import { PRODUCT_ROLE_LABELS } from "@/features/roles/constants/productRoles";
import {
  Shield,
  Users,
  Crown,
  UserCheck,
  Star,
  Settings,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const AVAILABLE_ICONS = [
  { value: "Users", label: "Users", icon: Users },
  { value: "UserCheck", label: "User Check", icon: UserCheck },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "Crown", label: "Crown", icon: Crown },
  { value: "Star", label: "Star", icon: Star },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "Eye", label: "Eye", icon: Eye },
];

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: CompanyRole;
  onSave: (data: CreateRoleData) => void;
  isLoading?: boolean;
}

export default function RoleManagementDialog({
  open,
  onOpenChange,
  role,
  onSave,
  isLoading = false,
}: RoleManagementDialogProps) {
  const { t } = useTranslation();
  const [startFrom, setStartFrom] = useState("level:manager");
  const [formData, setFormData] = useState<CreateRoleData>(() => {
    if (role) {
      const productLevel = resolveProductLevel(role);
      return {
        name: role.name,
        description: role.description || "",
        color: role.color,
        icon: role.icon,
        hierarchy_level: role.hierarchy_level,
        product_level: productLevel,
        permissions: clampPermissionsToProductLevel(
          productLevel,
          role.permissions || {},
        ),
      };
    }

    const cloned = cloneClassFromProductLevel("manager");
    return {
      ...cloned,
      name: "",
    };
  });

  useEffect(() => {
    if (!open) return;
    if (role) {
      const productLevel = resolveProductLevel(role);
      setFormData({
        name: role.name,
        description: role.description || "",
        color: role.color,
        icon: role.icon,
        hierarchy_level: role.hierarchy_level,
        product_level: productLevel,
        permissions: clampPermissionsToProductLevel(
          productLevel,
          role.permissions || {},
        ),
      });
      setStartFrom(`level:${productLevel}`);
      return;
    }

    const cloned = cloneClassFromProductLevel("manager");
    setStartFrom("level:manager");
    setFormData({
      ...cloned,
      name: "",
    });
  }, [open, role]);

  const productLevel = resolveProductLevel(formData);

  const applyStartFrom = (value: string) => {
    setStartFrom(value);
    const level = value.replace("level:", "");
    if (!isCloneableProductLevel(level)) return;
    const cloned = cloneClassFromProductLevel(level, formData.name);
    setFormData((prev) => ({
      ...cloned,
      name: prev.name,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      product_level: productLevel,
      permissions: clampPermissionsToProductLevel(
        productLevel,
        formData.permissions,
      ),
    });
  };

  const handleAccessChange = (
    rowId: string,
    switchId: string,
    enabled: boolean,
  ) => {
    const item = findAccessSwitch(rowId, switchId);
    if (!item) return;
    if (productLevel === "owner" && item.ownerLocked) return;
    setFormData((prev) => {
      const permissions = { ...(prev.permissions ?? {}) };
      for (const key of item.keys) {
        if (permissionAllowedAtLevel(productLevel, key)) {
          permissions[key] = enabled;
        }
      }
      return { ...prev, permissions };
    });
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find((i) => i.value === iconName);
    return iconConfig?.icon || Users;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Edit class" : "Create class"}</DialogTitle>
          <DialogDescription>
            {role
              ? `This class sits on the locked ${PRODUCT_ROLE_LABELS[productLevel]} level.`
              : "Start from a system role. The class can use that level’s access, never more."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">{t("updates.basicInformation")}</TabsTrigger>
              <TabsTrigger value="permissions">{t("employees.access")}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("onboarding.roleSetup.roleName")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t("roles.enterRoleName")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-from">
                    {role ? "Locked level" : "Start from"}
                  </Label>
                  {role ? (
                    <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
                      {PRODUCT_ROLE_LABELS[productLevel]}
                    </div>
                  ) : (
                    <Select value={startFrom} onValueChange={applyStartFrom}>
                      <SelectTrigger id="start-from">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLONEABLE_PRODUCT_LEVELS.map((level) => (
                          <SelectItem key={level} value={`level:${level}`}>
                            Start from {PRODUCT_ROLE_LABELS[level]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {productLevel === "owner"
                      ? "Owner always keeps team, roles, settings, and billing."
                      : productLevel === "staff"
                        ? "You can grant See on team schedule, run lists, and team. Edit, create/delete, settings, and billing stay off."
                        : "Settings and billing stay off unless this class sits on Admin."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("schedule.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder={t("roles.describeThisRoleSResponsibilities")}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">{t("roles.color")}</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="w-16 h-10"
                    />
                    <Badge
                      style={{
                        backgroundColor: formData.color,
                        color: "white",
                      }}
                    >{t("schedule.preview")}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">{t("sections.icon")}</Label>
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
                            const IconComponent = getIconComponent(
                              formData.icon,
                            );
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
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("roles.eachClassStartsFromItsLevelGiveOr")}</p>
              <OperatorAccessGrid
                level={productLevel}
                permissions={formData.permissions}
                idPrefix={role?.id ?? "new-class"}
                onAccessChange={handleAccessChange}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >{t("common.cancel")}</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : role ? "Update class" : "Create class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
