import { useState, lazy, Suspense, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useScheduling } from "@/contexts/SchedulingContext";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  getSupabaseSetupMessage,
  isMissingBackendResourceError,
} from "@/shared/utils/supabaseErrors";
import { useSchedulingPanels } from "@/features/scheduling/hooks/useSchedulingPanels";
import { useSchedulingRole } from "@/features/scheduling/hooks/useSchedulingRole";
import { useHoursSummary } from "@/features/scheduling/hooks/useHoursSummary";
import { sanitizeLocationFilter } from "@/features/scheduling/utils/locationFilter";
import { ScheduleReadinessPanel } from "./ScheduleReadinessPanel";
import { SchedulingHeader } from "./SchedulingHeader";
import { SchedulingPanelSheet } from "./SchedulingPanelSheet";
import { AutoScheduleDialog } from "./AutoScheduleDialog";
import type { SchedulingPanelId } from "../types/panels";

const EnhancedCalendarView = lazy(() =>
  import("./EnhancedCalendarView").then((m) => ({
    default: m.EnhancedCalendarView,
  })),
);

const SmartFillSidebar = lazy(() =>
  import("./SmartFillSidebar").then((m) => ({
    default: m.SmartFillSidebar,
  })),
);

const SCHEDULING_RESOURCE_NAMES = [
  "schedules",
  "schedule_assignments",
  "time_off_requests",
  "user_unavailability",
  "vendor_event",
  "vendor_visits",
];

export function NextGenSchedulingSystem({
  locationFilter,
}: {
  locationFilter?: string;
}) {
  const { profile } = useProfile();
  const schedulingRole = useSchedulingRole();
  const {
    shifts,
    assignments,
    loading,
    refetchAll,
    isFallbackData,
    availableLocations,
    error: schedulingError,
  } = useScheduling();

  const sanitizedLocationFilter = sanitizeLocationFilter(
    locationFilter,
    availableLocations,
  );

  const {
    activePanel,
    availabilityView,
    openPanel,
    closePanel,
    handleAvailabilityViewChange,
  } = useSchedulingPanels({ locationFilter: sanitizedLocationFilter });

  const { hoursSummary } = useHoursSummary({
    shifts,
    assignments,
    locationFilter: sanitizedLocationFilter,
  });

  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [smartFillTrigger, setSmartFillTrigger] = useState(0);

  const advancedFeaturesDisabled = Boolean(isFallbackData || schedulingError);
  const schedulingSetupMissing = isMissingBackendResourceError(
    schedulingError,
    SCHEDULING_RESOURCE_NAMES,
  );

  const showStatusAlert = Boolean(schedulingError) || isFallbackData;
  const statusTitle = isFallbackData
    ? "Viewing demo scheduling data"
    : "Scheduling data unavailable";
  const statusDescription = isFallbackData
    ? "Live scheduling data could not be reached. Preview data is displayed and scheduling actions are temporarily disabled."
    : (schedulingError ??
      "An unexpected error occurred while loading scheduling data.");
  const actionsDisabled = isFallbackData;
  const retryDisabled = loading;

  const handleRetry = () => {
    void refetchAll();
  };

  const handleReadinessAction = (
    target: SchedulingPanelId | "schedule" | "reports",
  ) => {
    if (target === "reports") return;
    if (target === "schedule") {
      document
        .getElementById("schedule-board")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    openPanel(target);
  };

  const handleSuggestFills = useCallback(() => {
    setSmartFillTrigger((count) => count + 1);
  }, []);

  const isStaffView = schedulingRole.isStaff;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SchedulingHeader role={schedulingRole} onPanelOpen={openPanel} />

      <div className="container mx-auto flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4">
        {schedulingSetupMissing ? (
          <FeatureSetupRequiredState
            title="Scheduling module is not fully set up yet"
            description={getSupabaseSetupMessage(schedulingError, "Scheduling")}
            icon={<Calendar className="h-5 w-5" />}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                Retry
              </Button>
            }
            setupDescription={
              <>
                Missing scheduling database resources. Restore the scheduling
                migrations for <code>schedules</code>,{" "}
                <code>schedule_assignments</code>, time off, availability, and
                vendor visits, then refresh this page.
              </>
            }
          />
        ) : schedulingError ? (
          <FeatureErrorState
            title="Scheduling data unavailable"
            description={statusDescription}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                Retry
              </Button>
            }
            className="mb-4"
          />
        ) : showStatusAlert ? (
          <Alert
            variant={isFallbackData ? "default" : "destructive"}
            className="mb-3"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{statusTitle}</AlertTitle>
            <AlertDescription>{statusDescription}</AlertDescription>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        <ScheduleReadinessPanel
          locationFilter={sanitizedLocationFilter}
          onAction={handleReadinessAction}
          role={schedulingRole}
          hoursSummary={hoursSummary}
        />

        <div
          className={
            isStaffView
              ? "mt-3 flex min-h-0 flex-1 flex-col"
              : "mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]"
          }
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <EnhancedCalendarView
                locationFilter={sanitizedLocationFilter}
                onOpenPanel={openPanel}
                onAutoScheduleClick={() => setShowAutoScheduler(true)}
                actionsDisabled={actionsDisabled}
                readOnly={isStaffView}
                profileId={schedulingRole.profileId}
                onSuggestFills={handleSuggestFills}
              />
            </Suspense>
          </div>

          {!isStaffView && (
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <SmartFillSidebar
                locationFilter={sanitizedLocationFilter}
                expandTrigger={smartFillTrigger}
              />
            </Suspense>
          )}
        </div>
      </div>

      <SchedulingPanelSheet
        panel={activePanel}
        availabilityView={availabilityView}
        advancedFeaturesDisabled={advancedFeaturesDisabled}
        retryDisabled={retryDisabled}
        role={schedulingRole}
        onClose={closePanel}
        onRetry={handleRetry}
        onAvailabilityViewChange={handleAvailabilityViewChange}
      />

      {!isStaffView && (
        <AutoScheduleDialog
          open={showAutoScheduler}
          onOpenChange={setShowAutoScheduler}
          defaultLocationId={sanitizedLocationFilter ?? undefined}
          companyId={profile?.companyId ?? undefined}
        />
      )}
    </div>
  );
}
