import { useTranslation } from "react-i18next";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/useCan";
import { usePermissions } from "@/hooks/usePermissions";
import { UnifiedSectionsManager } from "@/features/sections/components/UnifiedSectionsManager";
import { SectionsReadinessPanel } from "@/features/sections/components/SectionsReadinessPanel";
import RoleConfigurationTab from "@/features/roles/components/RoleConfigurationTab";
import SectionPermissionsTab from "@/features/roles/components/SectionPermissionsTab";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";
import { useNavigate } from "@/lib/router-adapter";

import {
  Layers,
  Shield,
  Plus,
  Settings,
  LayoutTemplate,
  Users,
} from "lucide-react";

export default function SectionsPermissions() {
  const { t } = useTranslation();
  const { can } = useCan();
  const { hasRole } = usePermissions();
  const navigate = useNavigate();
  const [enabledSections, setEnabledSections] = useState<string[]>(
    AVAILABLE_SECTIONS.filter((s) => s.enabled).map((s) => s.id),
  );

  // Business templates are moved to onboarding; no runtime selection here.

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setEnabledSections((prev) =>
      enabled ? [...prev, sectionId] : prev.filter((id) => id !== sectionId),
    );
  };

  const handleSaveConfiguration = () => {
    // Here you would save the configuration to the backend
  };

  // Check for broader admin permissions using role checking
  if (!can("systemSettings") && !hasRole(["company_admin", "owner", "admin"])) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("common.accessDenied")}
          </h3>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to access sections and permissions
            management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t("sections.sectionsAccess")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("sections.manageBusinessTemplatesNavigationSectionsAndRoleBasedAccessControl")}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <LayoutTemplate className="mr-2 h-4 w-4" />
              {t("sections.importTemplate")}
            </Button>
            <Button onClick={() => navigate("/app/add-section")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("sections.createCustomSection")}
            </Button>
          </div>
        </div>

        <SectionsReadinessPanel
          onAddSection={() => navigate("/app/add-section")}
        />

        <Tabs defaultValue="sections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sections">{t("sections.sectionManagement")}</TabsTrigger>
            <TabsTrigger value="roles">{t("sections.roleConfiguration")}</TabsTrigger>
            <TabsTrigger value="permissions">{t("sections.permissionsMatrix")}</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="mr-2 h-5 w-5" />
                  {t("sections.sectionManagement")}
                </CardTitle>
                <CardDescription>
                  {t("sections.configureWhichSectionsAreAvailableInYourWorkspace")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <UnifiedSectionsManager
                  selectedSections={enabledSections}
                  onSectionToggle={handleSectionToggle}
                />

                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveConfiguration}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("sections.saveConfiguration")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {t("sections.roleConfiguration")}
                </CardTitle>
                <CardDescription>
                  {t("sections.createAndManageCustomRolesForYourOrganization")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleConfigurationTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <SectionPermissionsTab />
          </TabsContent>

          <TabsContent value="permissions-old" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  {t("sections.roleBasedAccessControl")}
                </CardTitle>
                <CardDescription>
                  {t("sections.configureWhatEachRoleCanAccessInTheApplication")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {["staff", "supervisor", "manager", "admin", "owner"].map(
                    (role) => {
                      return (
                      <div key={role} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Badge
                              className={`
                            ${
                              role === "owner"
                                ? "bg-secondary/10 text-secondary"
                                : role === "admin"
                                  ? "bg-destructive/10 text-destructive"
                                  : role === "manager"
                                    ? "bg-primary/10 text-primary"
                                    : role === "supervisor"
                                      ? "bg-success-muted text-success"
                                      : "bg-muted text-foreground"
                            }
                          `}
                            >
                              {role.replace("_", " ")}
                            </Badge>
                            <span className="font-medium capitalize">
                              {role.replace("_", " ")} {t("registration.roles.permissions")}
                            </span>
                          </div>
                          <Button variant="outline" size="sm">
                            {t("sections.editPermissions")}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium text-foreground mb-2">
                              {t("sections.coreFeatures")}
                            </h5>
                            <div className="space-y-1 text-muted-foreground">
                              <div>{t("sections.dashboard")}</div>
                              <div>{t("sections.messages")}</div>
                              <div>{t("sections.tasks")}</div>
                              <div>{t("sections.profile")}</div>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium text-foreground mb-2">
                              {t("inventory.management")}
                            </h5>
                            <div className="space-y-1 text-muted-foreground">
                              <div>
                                {[
                                  "supervisor",
                                  "manager",
                                  "admin",
                                  "owner",
                                ].includes(role)
                                  ? "✓"
                                  : "✗"}{" "}
                                {t("sections.teamView")}
                              </div>
                              <div>
                                {["manager", "admin", "owner"].includes(role)
                                  ? "✓"
                                  : "✗"}{" "}
                                {t("sections.approveRequests")}
                              </div>
                              <div>
                                {["admin", "owner"].includes(role) ? "✓" : "✗"}{" "}
                                {t("navigation.userManagement")}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-medium text-foreground mb-2">
                              {t("sections.system")}
                            </h5>
                            <div className="space-y-1 text-muted-foreground">
                              <div>
                                {["manager", "admin", "owner"].includes(role)
                                  ? "✓"
                                  : "✗"}{" "}
                                {t("common.analytics")}
                              </div>
                              <div>
                                {["admin", "owner"].includes(role) ? "✓" : "✗"}{" "}
                                {t("common.settings")}
                              </div>
                              <div>
                                {["admin", "owner"].includes(role) ? "✓" : "✗"}{" "}
                                {t("schedule.templates")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
