"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ui/error-boundary";
import { appEnv } from "@/lib/env";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <NavigationGuard>
        <ProtectedRoute>
          <AppShell>{children}</AppShell>
        </ProtectedRoute>
      </NavigationGuard>
    </ErrorBoundary>
  );
}
