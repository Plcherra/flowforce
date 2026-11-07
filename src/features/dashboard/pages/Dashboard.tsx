import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import { MobileCoreWorkflowActions } from "@/features/dashboard/components/MobileCoreWorkflowActions";
import { RoleOverview } from "@/features/dashboard/overview/RoleOverview";
import { PacksDiscoveryBanner } from "@/features/packs/components/PacksDiscoveryBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import ErrorBoundary from "@/components/ui/error-boundary";

export default function Dashboard() {
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? "space-y-4 px-3 py-4" : "space-y-6 px-6 py-6"} w-full`}>
      <ErrorBoundary>
        <DashboardHeader />
      </ErrorBoundary>
      <ErrorBoundary>
        <PacksDiscoveryBanner />
      </ErrorBoundary>
      {isMobile ? (
        <ErrorBoundary>
          <MobileCoreWorkflowActions />
        </ErrorBoundary>
      ) : null}
      <ErrorBoundary>
        <RoleOverview />
      </ErrorBoundary>
    </div>
  );
}
