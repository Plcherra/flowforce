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
      <div className={`${isMobile ? 'p-3 space-y-3' : 'p-6 space-y-4'} max-w-7xl mx-auto`}>
        <ErrorBoundary>
          <DashboardHeader />
        </ErrorBoundary>
        
        <ErrorBoundary>
          <DashboardStats stats={stats} loading={statsLoading} />
        </ErrorBoundary>

        {/* Main Dashboard Grid - Row 1 */}
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
          <ErrorBoundary>
            <AIInsightsPanel type="dashboard" className="h-[320px]" />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <PerformanceRadarChart className="h-[400px]" />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <ProfileCard className="h-[320px]" />
          </ErrorBoundary>
        </div>

        {/* Main Dashboard Grid - Row 2 */}
        <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
          <ErrorBoundary>
            <CompanyUpdatesCard className="h-[400px]" />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <ActivityCard className="h-[320px]" />
          </ErrorBoundary>
          
          <ErrorBoundary>
            <OperationsHealthCard
              className="h-fit"
              stats={stats}
              loading={statsLoading}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* AI Chat Assistant */}
      <ErrorBoundary>
        <AIChatAssistant context="dashboard" />
      </ErrorBoundary>
    </PageAsyncWrapper>
  );
}
