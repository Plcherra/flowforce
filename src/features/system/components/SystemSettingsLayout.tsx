"use client";

import { Profiler, ReactNode, useState } from "react";
import RoleGuard from "@/app-shell/guards/RoleGuard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { SystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { appEnv } from "@/lib/env";
import { logger } from "@/utils/logger";
import { useTranslation } from "react-i18next";

type TabConfig = {
  key: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
};

type SystemSettingsLayoutProps = {
  tabs: TabConfig[];
};

export function SystemSettingsLayout({ tabs }: SystemSettingsLayoutProps) {
  const { t } = useTranslation();
  const system = useSystemSettings();
  const {
    company,
    settings,
    loading,
    error,
    refresh,
    missingCompany,
  } = system;

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key ?? "");

  const hasTabs = tabs.length > 0;

  const handleProfilerRender = (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
  ) => {
    if (appEnv.DEV) {
      logger.debug(
        `[system-settings] ${id} ${phase} render: ${actualDuration.toFixed(1)}ms`,
        { context: { id, phase, duration: actualDuration }, tags: ["debug"] },
      );
    }
    if (typeof performance !== "undefined" && "mark" in performance) {
      performance.mark(`system-settings:${id}:${phase}`);
    }
  };

  const fallback = (
    <EmptyState
      title={t("settings.noSettingsAvailable")}
      description={t("settings.noSettingsForCompany")}
      action={
        <Button variant="outline" onClick={refresh}>{t("common.refresh")}</Button>
      }
    />
  );

  const missingCompanyFallback = (
    <EmptyState
      title={t("shell.noCompanyDetected")}
      description={t("settings.profileNotLinkedToCompany")}
      action={
        <Button asChild>
          <a href="/company-registration">{t("settings.goToCompanySetup")}</a>
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <RoleGuard
        roles={["admin", "company_admin", "owner", "manager"]}
        fallback={fallback}
      >
        <div className="flex h-full items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>{t("settings.loadingSystemSettings")}</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard
        roles={["admin", "company_admin", "owner", "manager"]}
        fallback={fallback}
      >
        <ErrorState message={error.message} onRetry={refresh} />
      </RoleGuard>
    );
  }

  if (missingCompany) {
    return (
      <RoleGuard
        roles={["admin", "company_admin", "owner", "manager"]}
        fallback={missingCompanyFallback}
      >
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-semibold text-foreground">{t("shell.noCompanyDetected")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("settings.profileNotLinkedToWorkspace")}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => system.linkCompany()}
              disabled={system.linkingCompany}
            >
              {system.linkingCompany ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t("settings.createDemoWorkspace")}
            </Button>
            <Button variant="outline" asChild>
              <a href="/company-registration">{t("settings.goToCompanySetup")}</a>
            </Button>
          </div>
          {system.linkCompanyError && (
            <p className="text-sm text-destructive">
              {system.linkCompanyError.message}
            </p>
          )}
        </div>
      </RoleGuard>
    );
  }

  if (!settings || !company) {
    return (
      <RoleGuard
        roles={["admin", "company_admin", "owner", "manager"]}
        fallback={fallback}
      >
        {fallback}
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      roles={["admin", "company_admin", "owner", "manager"]}
      fallback={fallback}
    >
      <SystemSettingsContext.Provider value={system}>
        <div className="space-y-6 p-6 md:p-10">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("common.settings")}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={refresh}
              aria-label={t("settings.refreshSettings")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </header>

          {hasTabs ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value)}
            >
              <TabsList className="flex h-auto w-full flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-primary/15 bg-background/80 p-1.5 text-muted-foreground shadow-sm">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className="rounded-xl border border-transparent px-3.5 py-2 text-sm font-medium shadow-none transition-all hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/25 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none"
                    >
                      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {tabs.map((tab) => (
                <Profiler
                  key={tab.key}
                  id={`settings-${tab.key}`}
                  onRender={handleProfilerRender}
                >
                  <TabsContent value={tab.key} className="mt-6">
                    {tab.content}
                  </TabsContent>
                </Profiler>
              ))}
            </Tabs>
          ) : (
            fallback
          )}
        </div>
      </SystemSettingsContext.Provider>
    </RoleGuard>
  );
}
