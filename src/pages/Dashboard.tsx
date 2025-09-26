import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import AIChatAssistant from '@/components/ai/AIChatAssistant';
import PerformanceRadarChart from '@/components/ai/PerformanceRadarChart';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardStats from '@/components/dashboard/DashboardStats';
import ProfileCard from '@/components/dashboard/ProfileCard';
import ActivityCard from '@/components/dashboard/ActivityCard';
import CompanyUpdatesCard from '@/components/dashboard/CompanyUpdatesCard';
import OperationsHealthCard from '@/components/dashboard/OperationsHealthCard';
import { useDashboardData } from '@/hooks/useDashboardData.tsx';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageAsyncWrapper } from '@/components/ui/async-wrapper';
import ErrorBoundary from '@/components/ui/error-boundary';
import { useMemo } from 'react';

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { stats, loading: statsLoading } = useDashboardData();
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  // Memoize the profile data to prevent unnecessary re-renders
  const memoizedProfile = useMemo(() => profile, [profile]);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <PageAsyncWrapper
      isLoading={profileLoading}
      error={profileError}
      onRetry={handleRetry}
      loadingTitle="Loading Dashboard"
      loadingDescription="Setting up your workspace..."
    >
      <div className={`${isMobile ? 'px-3 py-4 space-y-4' : 'px-6 py-6 space-y-6'} max-w-7xl mx-auto`}>
        <ErrorBoundary>
          <DashboardHeader />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <DashboardStats stats={stats} loading={statsLoading} />
        </ErrorBoundary>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <ErrorBoundary>
              <OperationsHealthCard
                className="min-h-[260px]"
                stats={stats}
                loading={statsLoading}
              />
            </ErrorBoundary>

            <ErrorBoundary>
              <PerformanceRadarChart className="min-h-[320px]" />
            </ErrorBoundary>

            <ErrorBoundary>
              <CompanyUpdatesCard />
            </ErrorBoundary>
          </div>

          <div className="space-y-4">
            <ErrorBoundary>
              <AIInsightsPanel type="dashboard" className="min-h-[240px]" />
            </ErrorBoundary>

            <ErrorBoundary>
              <ProfileCard className="min-h-[220px]" />
            </ErrorBoundary>

            <ErrorBoundary>
              <ActivityCard className="min-h-[220px]" />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* AI Chat Assistant */}
      <ErrorBoundary>
        <AIChatAssistant context="dashboard" />
      </ErrorBoundary>
    </PageAsyncWrapper>
  );
}
