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
import { useTranslation } from "react-i18next";
import { NameCombobox } from "@/features/employees/components/invites/NameCombobox";
import { removeRoleIfUnused } from "@/features/employees/utils/inviteCatalogActions";
import { coffeeShopStarter } from "@/features/onboarding/utils/orgTemplates";
import { cloneClassFromProductLevel } from "@/features/roles/constants/productLevels";
import { useProfile } from "@/hooks/useProfile";

export default function RoleConfigurationTab() {
  const { t } = useTranslation();
  const { can } = useCan();
  const { company, updateCompany } = useCompany();
  const { profile } = useProfile();
  const invitePolicy = parseInviteGrantPolicy(company?.template_config);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [rolePick, setRolePick] = useState("");
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
      window.confirm(t("roles.archiveClassConfirm"))
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
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">{t("common.accessDenied")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("roles.noPermissionToManageRoles")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">{t("roles.loadingRoles")}</div>;
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
                  <h4 className="font-medium text-foreground">{role.name}</h4>
                  <Badge
                    style={{
                      backgroundColor: role.color + "20",
                      color: role.color,
                      border: `1px solid ${role.color}40`,
                    }}
                  >
                    {PRODUCT_ROLE_LABELS[productLevel]} {t("literals.level3")}
                  </Badge>
                  {role.is_system_role && (
                    <Badge variant="secondary">{t("roles.systemRole")}</Badge>
                  )}
                  {role.is_active === false && (
                    <Badge variant="outline">{t("forms.archived")}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {role.description || t("literals.noDescriptionProvided")}
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
                <Edit className="h-4 w-4 mr-1" />{t("common.edit")}</Button>
              {role.is_active === false ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreRole(role)}
                >{t("onboarding.restore")}</Button>
              ) : canDeactivateClass(role) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteRole(role)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />{t("updates.archive")}</Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="role-configuration-tab">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("sections.roleConfiguration")}</h3>
          <p className="text-muted-foreground mt-1">{t("roles.plantClassesOnALockedLevelThenGive")}</p>
        </div>
        <Button onClick={handleCreateRole}>
          <Plus className="h-4 w-4 mr-2" />{t("onboarding.createClass")}</Button>
      </div>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="space-y-1">
            <Label htmlFor="manager-invite-managers">{t("roles.managersCanInviteManagerLevelClasses")}</Label>
            <p className="text-sm text-muted-foreground">{t("roles.leaveThisOnSoAGmCanInvite")}</p>
          </div>
          <Switch
            id="manager-invite-managers"
            checked={invitePolicy.managerCanInviteManagers}
            disabled={savingPolicy || !company}
            onCheckedChange={handleInvitePolicyChange}
          />
        </CardContent>
      </Card>

      <NameCombobox
        label={t("employees.role")}
        value={rolePick}
        testId="settings-role-combobox"
        options={[
          ...(Array.isArray(roles) ? roles : [])
            .filter((role) => role.is_active)
            .map((role) => ({ id: role.id, name: role.name })),
          ...coffeeShopStarter(t).departments.flatMap((department) =>
            department.roles.map((role) => ({ id: "", name: role.name, suggested: true as const })),
          ),
        ]}
        onSelect={setRolePick}
        onCreate={(name) => {
          const level = coffeeShopStarter(t).departments
            .flatMap((department) => department.roles)
            .find((role) => role.name.toLowerCase() === name.toLowerCase())?.level ?? "staff";
          void createRole.mutateAsync({
            ...cloneClassFromProductLevel(level, name),
          });
        }}
        onDelete={async (id) => {
          const companyId = profile?.company_id ?? profile?.companyId;
          const role = (Array.isArray(roles) ? roles : []).find((item) => item.id === id);
          if (!companyId || !role) return "blocked";
          const result = await removeRoleIfUnused(companyId, id, role.name);
          if (result === "ok") setRolePick("");
          return result;
        }}
      />

      <div className="grid gap-4">{activeRoles.map(renderRoleCard)}</div>

      {archivedRoles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">{t("roles.archivedClasses")}</h4>
          <div className="grid gap-4">{archivedRoles.map(renderRoleCard)}</div>
        </div>
      )}

      {rolesArray.length === 0 && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{t("roles.noRolesFound")}</h3>
          <p className="text-muted-foreground mb-4">{t("roles.createYourFirstClassToGetStarted")}</p>
          <Button onClick={handleCreateRole}>
            <Plus className="h-4 w-4 mr-2" />{t("onboarding.createClass")}</Button>
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
