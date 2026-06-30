import { ReactNode, Suspense } from "react";
import { Outlet } from "@/lib/router-adapter";
import { AppSidebar } from "@/app-shell/navigation/AppSidebar";
import { TopNavbar } from "@/app-shell/layout/TopNavbar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LoadingSpinner } from "@/components/ui/loading-states";
import ErrorBoundary from "@/components/ui/error-boundary";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { appEnv } from "@/lib/env";
import { TenantSetupRequired } from "@/app-shell/tenant/TenantSetupRequired";
import { useMobilePushNotifications } from "@/hooks/useMobilePushNotifications";
import { MobileOfflineQueueStatus } from "@/app-shell/mobile/MobileOfflineQueueStatus";

interface AppShellProps {
  children?: ReactNode;
}

function WorkspaceLoadingState({ text }: { text: string }) {
  return (
    <div className="app-viewport flex w-full flex-col overflow-hidden bg-background">
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-y-auto">
        <LoadingSpinner text={text} />
      </div>
    </div>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading: authLoading } = useAuth();
  const profileState = useProfile();
  const resolvedProfile = profileState.profile;
  const companyId =
    resolvedProfile?.companyId ?? resolvedProfile?.company_id ?? null;

  useMobilePushNotifications({
    userId: user?.id,
    companyId: companyId ?? undefined,
  });

  if (authLoading || !user) {
    return <WorkspaceLoadingState text="Preparing your workspace..." />;
  }

  if (!profileState.isReady || profileState.loading) {
    return <WorkspaceLoadingState text="Loading your profile..." />;
  }

  if (!companyId || resolvedProfile?.isPlaceholder) {
    return <TenantSetupRequired profileState={profileState} />;
  }

  return (
    <SidebarProvider className="app-viewport min-h-0 w-full overflow-hidden">
      <AppSidebar />

      <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-primary/20 bg-background/95 px-2 backdrop-blur-sm md:px-4">
          <SidebarTrigger className="mr-2 md:mr-4" />
          <TopNavbar />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <MobileOfflineQueueStatus />
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
      </SidebarInset>
    </SidebarProvider>
  );
}
