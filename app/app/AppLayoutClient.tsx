"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/app-shell/guards/ProtectedRoute";
import AppShell from "@/app-shell/AppShell";
import ErrorBoundary from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { appEnv } from "@/lib/env";
import { NavigationGuard } from "@/app-shell/navigation/NavigationGuard";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background">
            <LoadingSpinner text="Loading workspace..." />
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
