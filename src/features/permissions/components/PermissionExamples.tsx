import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PermissionButton,
  MultiPermissionButton,
  PermissionGuard,
  MultiPermissionGuard,
  RouteGuard,
  withPermission,
  type WithPermissionInjectedProps,
} from "@/components/permissions";
import {
  useCan,
  useCanCheck,
  useCanMultiple,
  useAllPermissions,
} from "@/hooks/useCan";
import { UserPlus, Settings, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Examples showing how to use the permission system
 */
export function PermissionExamples() {
  const { t } = useTranslation();
  const { can, canAny, canAll, getSource, permissions } = useCan();
  const canManageUsers = useCanCheck("manageUsers");
  const canViewOrEdit = useCanMultiple(
    ["viewTeamProfiles", "editTeamProfiles"],
    "any",
  );
  const allPermissions = useAllPermissions();

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("permissions.permissionSystemExamples")}</h1>
        <p className="text-muted-foreground mt-2">{t("permissions.demonstratingDifferentWaysToUseThePermissionSystem")}</p>
      </div>

      {/* Hook Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.n1HookUsageExamples")}</CardTitle>
          <CardDescription>{t("permissions.differentWaysToCheckPermissionsUsingHooks")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">{t("permissions.usecanHook")}</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={can("manageUsers") ? "default" : "secondary"}>
                    Manage Users: {can("manageUsers") ? "Yes" : "No"}
                  </Badge>
                  <Badge variant="outline">
                    Source: {getSource("manageUsers")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={can("viewTeamProfiles") ? "default" : "secondary"}
                  >
                    View Team: {can("viewTeamProfiles") ? "Yes" : "No"}
                  </Badge>
                  <Badge variant="outline">
                    Source: {getSource("viewTeamProfiles")}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">{t("permissions.specializedHooks")}</h4>
              <div className="space-y-2">
                <Badge variant={canManageUsers ? "default" : "secondary"}>
                  useCanCheck: {canManageUsers ? "Yes" : "No"}
                </Badge>
                <Badge variant={canViewOrEdit ? "default" : "secondary"}>
                  useCanMultiple (ANY): {canViewOrEdit ? "Yes" : "No"}
                </Badge>
                <Badge
                  variant={
                    canAll(["viewTeamProfiles", "editTeamProfiles"])
                      ? "default"
                      : "secondary"
                  }
                >
                  canAll (View & Edit):{" "}
                  {canAll(["viewTeamProfiles", "editTeamProfiles"])
                    ? "Yes"
                    : "No"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.n2PermissionButtons")}</CardTitle>
          <CardDescription>{t("permissions.buttonsThatRespectPermissionsWithDifferentBehaviors")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <PermissionButton permission="manageUsers" variant="default">
              <UserPlus className="h-4 w-4 mr-2" />{t("employees.addUser")}</PermissionButton>

            <PermissionButton
              permission="systemSettings"
              variant="outline"
              hideWhenDenied={true}
            >
              <Settings className="h-4 w-4 mr-2" />{t("navigation.systemSettings")}</PermissionButton>

            <MultiPermissionButton
              permissions={["viewTeamProfiles", "editTeamProfiles"]}
              strategy="any"
              variant="secondary"
            >
              <Users className="h-4 w-4 mr-2" />{t("common.positionManagement")}</MultiPermissionButton>

            <MultiPermissionButton
              permissions={["manageUsers", "systemSettings"]}
              strategy="all"
              variant="destructive"
              tooltipMessage="You need both User Management AND System Settings permissions"
            >
              <Shield className="h-4 w-4 mr-2" />{t("permissions.adminPanel")}</MultiPermissionButton>
          </div>
        </CardContent>
      </Card>

      {/* Permission Guards */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.n3PermissionGuards")}</CardTitle>
          <CardDescription>{t("permissions.conditionalRenderingBasedOnPermissions")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionGuard
            permission="manageUsers"
            fallback={
              <p className="text-muted-foreground">{t("permissions.youCannotManageUsers")}</p>
            }
          >
            <div className="p-4 bg-success-muted border border-success/40 rounded-lg">
              <p className="text-success">{t("permissions.youCanManageUsers")}</p>
            </div>
          </PermissionGuard>

          <MultiPermissionGuard
            permissions={["viewTeamProfiles", "editTeamProfiles"]}
            strategy="any"
            fallback={
              <p className="text-muted-foreground">{t("permissions.youCannotViewOrEditTeamProfiles")}</p>
            }
          >
            <div className="p-4 bg-primary/10 border border-primary/40 rounded-lg">
              <p className="text-primary">{t("permissions.youCanWorkWithTeamProfiles")}</p>
            </div>
          </MultiPermissionGuard>

          <MultiPermissionGuard
            permissions={["manageUsers", "systemSettings", "viewAIInsights"]}
            strategy="all"
            fallback={
              <p className="text-muted-foreground">{t("permissions.youNeedAllAdminPermissions")}</p>
            }
          >
            <div className="p-4 bg-secondary/10 border border-secondary/40 rounded-lg">
              <p className="text-secondary">{t("permissions.youHaveFullAdminAccess")}</p>
            </div>
          </MultiPermissionGuard>
        </CardContent>
      </Card>

      {/* HOC Example */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.n4HigherOrderComponentHoc")}</CardTitle>
          <CardDescription>{t("permissions.usingWithpermissionHocToWrapComponents")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedComponent />
          <ConditionalComponent />
        </CardContent>
      </Card>

      {/* All Permissions Display */}
      <Card>
        <CardHeader>
          <CardTitle>{t("permissions.n5AllPermissionsStatus")}</CardTitle>
          <CardDescription>{t("permissions.completeOverviewOfCurrentUserPermissions")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(allPermissions).map(
              ([permission, hasPermission]) => (
                <div
                  key={permission}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <span className="text-sm font-medium">{permission}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={hasPermission ? "default" : "secondary"}>
                      {hasPermission ? "Yes" : "No"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getSource(permission as any)}
                    </Badge>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example components using withPermission HOC
function BaseProtectedComponent({
  hasPermission,
  permissionSource,
  canCheck,
}: WithPermissionInjectedProps) {
  const { t } = useTranslation();
  return (
  <div
    className={`p-4 border rounded-lg ${hasPermission ? "bg-success-muted border-success/40" : "bg-destructive/10 border-destructive/40"}`}
  >
    <h4 className="font-semibold">{t("permissions.protectedComponent")}</h4>
    <p>Permission Status: {hasPermission ? "✓ Allowed" : "✗ Denied"}</p>
    <p>Source: {permissionSource}</p>
    <p>
      Can also check other permissions:{" "}
      {canCheck("viewTeamProfiles") ? "Can view team" : "Cannot view team"}
    </p>
  </div>
);
}

const ProtectedComponent = withPermission({
  permissionKey: "manageUsers",
  renderWhenDenied: true,
})(BaseProtectedComponent);

function BaseConditionalComponent() {
  const { t } = useTranslation();
  return (
  <div className="p-4 bg-primary/10 border border-primary/40 rounded-lg">
    <h4 className="font-semibold">{t("permissions.conditionalComponent")}</h4>
    <p>{t("permissions.thisOnlyShowsWhenYouHaveSystemsettingsPermission")}</p>
  </div>
);
}

function SystemSettingsHidden() {
  const { t } = useTranslation();
  return (
    <p className="text-muted-foreground">{t("permissions.systemSettingsComponentHiddenNoPermission")}</p>
  );
}

const ConditionalComponent = withPermission({
  permissionKey: "systemSettings",
  fallback: <SystemSettingsHidden />,
})(BaseConditionalComponent);
