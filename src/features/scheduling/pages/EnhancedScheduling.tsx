import { NextGenSchedulingSystem } from "@/features/scheduling/components/NextGenSchedulingSystem";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSearchParams } from "@/lib/router-adapter";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import ErrorBoundary from "@/components/ui/error-boundary";
import { SchedulingErrorFallback } from "@/components/ui/feature-error-fallbacks";

export default function EnhancedScheduling() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const locationFilter = params.get("location") || undefined;

  return (
    <ErrorBoundary fallbackRender={SchedulingErrorFallback}>
      <SchedulingProvider>
        <div>
          <div className={isMobile ? "p-2" : "p-6"}>
            <NextGenSchedulingSystem locationFilter={locationFilter} />
          </div>
        </div>
      </SchedulingProvider>
    </ErrorBoundary>
  );
}
