import { NextGenSchedulingSystem } from "@/features/scheduling/components/NextGenSchedulingSystem";
import { useSearchParams } from "@/lib/router-adapter";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import ErrorBoundary from "@/components/ui/error-boundary";
import { SchedulingErrorFallback } from "@/components/ui/feature-error-fallbacks";

export default function EnhancedScheduling() {
  const [params] = useSearchParams();
  const locationFilter = params.get("location") || undefined;

  return (
    <ErrorBoundary fallbackRender={SchedulingErrorFallback}>
      <SchedulingProvider>
        <div className="min-h-0">
          <NextGenSchedulingSystem locationFilter={locationFilter} />
        </div>
      </SchedulingProvider>
    </ErrorBoundary>
  );
}
