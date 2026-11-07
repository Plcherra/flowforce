"use client";

import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "@/app-shell/guards/ProtectedRoute";
import AppShell from "@/app-shell/AppShell";
import ErrorBoundary from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { appEnv } from "@/lib/env";
import { NavigationGuard } from "@/app-shell/navigation/NavigationGuard";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background">
            <LoadingSpinner text={t("shell.loadingWorkspace")} />
          </div>
        }
      >
        <NavigationGuard>
          <ProtectedRoute>
            <AppShell>{children}</AppShell>
          </ProtectedRoute>
        </NavigationGuard>
      </Suspense>
    </ErrorBoundary>
  );
}
