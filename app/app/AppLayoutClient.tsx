"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ui/error-boundary";
import { appEnv } from "@/lib/env";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary showDetails={appEnv.DEV}>
      <ProtectedRoute>
        <AppShell>{children}</AppShell>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
