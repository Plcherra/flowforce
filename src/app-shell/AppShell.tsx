import { ReactNode, Suspense } from "react";
import { Outlet } from "@/lib/router-adapter";
import { AppSidebar } from "@/app-shell/navigation/AppSidebar";
import { TopNavbar } from "@/app-shell/layout/TopNavbar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LoadingSpinner } from "@/components/ui/loading-states";
import ErrorBoundary from "@/components/ui/error-boundary";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { appEnv } from "@/lib/env";
import { TenantSetupRequired } from "@/app-shell/tenant/TenantSetupRequired";

interface AppShellProps {
  children?: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading } = useAuth();
  const profileState = useProfile();

  if (loading || profileState.loading || !user) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
          <LoadingSpinner
            text={
              loading || profileState.loading
                ? "Preparing your workspace..."
                : "Redirecting you securely..."
            }
          />
        </div>
      </div>
    );
  }

  if (!profileState.profile?.companyId) {
    return <TenantSetupRequired profileState={profileState} />;
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Persistent Sidebar - never remounts */}
          <AppSidebar />

          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Navigation Bar with Sidebar Trigger */}
            <header className="h-12 flex items-center border-b border-primary/20 bg-background/95 backdrop-blur-sm shrink-0 px-2 md:px-4">
              <SidebarTrigger className="mr-2 md:mr-4" />
              <TopNavbar />
            </header>

            {/* Main Content - with scroll restoration and loading states */}
            <main className="flex-1 overflow-y-auto min-h-0">
              <ErrorBoundary showDetails={appEnv.DEV}>
                <Suspense
                  fallback={
                    <div className="p-6">
                      <LoadingSpinner text="Loading page..." />
                    </div>
                  }
                >
                  {children || <Outlet />}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
