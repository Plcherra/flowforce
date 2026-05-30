import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import ProfileCard from "@/features/dashboard/components/ProfileCard";
import ActivityCard from "@/features/dashboard/components/ActivityCard";
import CompanyUpdatesCard from "@/features/dashboard/components/CompanyUpdatesCard";
import OperationsHealthCard from "@/features/dashboard/components/OperationsHealthCard";
import OperatorCommandCenter from "@/features/dashboard/components/OperatorCommandCenter";
import { MobileCoreWorkflowActions } from "@/features/dashboard/components/MobileCoreWorkflowActions";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageAsyncWrapper } from "@/components/ui/async-wrapper";
import ErrorBoundary from "@/components/ui/error-boundary";
import { appEnv } from "@/lib/env";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch,
  } = useDashboardData();
  const {
    loading: profileLoading,
    error: profileError,
    refreshProfile,
  } = useProfile();

  const handleRetry = () => {
    void Promise.allSettled([refreshProfile(), refetch()]);
  };

  const devDiagnostics =
    appEnv.DEV && profileError ? (
      <div className="mx-auto w-full max-w-7xl px-6 pb-6">
        <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Supabase profile error</p>
          <pre className="mt-2 whitespace-pre-wrap break-words">
            {String(profileError ?? "Unknown error")}
          </pre>
        </div>
      </div>
    ) : null;

  return (
    <>
      <PageAsyncWrapper
        isLoading={profileLoading}
        error={profileError}
        onRetry={handleRetry}
        loadingTitle="Loading Dashboard"
        loadingDescription="Setting up your workspace..."
      >
        <div
          className={`${isMobile ? "px-3 py-4 space-y-4" : "px-6 py-6 space-y-6"} max-w-7xl mx-auto`}
        >
          <ErrorBoundary>
            <DashboardHeader />
          </ErrorBoundary>

          {isMobile && (
            <ErrorBoundary>
              <MobileCoreWorkflowActions />
            </ErrorBoundary>
          )}

          <ErrorBoundary>
            <OperatorCommandCenter
              stats={stats}
              statsLoading={statsLoading}
              statsError={statsError}
              onRetry={refetch}
            />
          </ErrorBoundary>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-4">
              <ErrorBoundary>
                <OperationsHealthCard
                  className="min-h-[260px]"
                  stats={stats}
                  loading={statsLoading}
                />
              </ErrorBoundary>

              <ErrorBoundary>
                <CompanyUpdatesCard />
              </ErrorBoundary>
            </div>

            <div className="space-y-4">
              <ErrorBoundary>
                <ProfileCard className="min-h-[220px]" />
              </ErrorBoundary>

              <ErrorBoundary>
                <ActivityCard className="min-h-[220px]" />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </PageAsyncWrapper>
      {devDiagnostics}
    </>
  );
}
