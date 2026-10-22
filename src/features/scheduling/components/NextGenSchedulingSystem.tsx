import { useTranslation } from "react-i18next";
import { useState, lazy, Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";
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
import { useSmartFillPanel } from "@/features/scheduling/hooks/useSmartFillPanel";
import { ScheduleReadinessPanel } from "./ScheduleReadinessPanel";
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
  const { t } = useTranslation();
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
  const smartFill = useSmartFillPanel(schedulingRole.profileId);
  const setSmartFillOpen = smartFill.setOpen;

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
    setSmartFillOpen(true);
    setSmartFillTrigger((count) => count + 1);
  }, [setSmartFillOpen]);

  const canBuildSchedule = schedulingRole.canManageSchedule;

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 w-full flex-1 flex-col px-2 py-1.5 sm:px-3">
        {schedulingSetupMissing ? (
          <FeatureSetupRequiredState
            title={t("schedule.schedulingModuleIsNotFullySetUpYet")}
            description={getSupabaseSetupMessage(schedulingError, "Scheduling")}
            icon={<Calendar className="h-5 w-5" />}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                {t("schedule.retry")}
              </Button>
            }
            setupDescription={
              <>
                {t("schedule.missingSchedulingDatabaseResourcesRestoreTheSchedulingMigrations")} <code>{t("schedule.schedules")}</code>,{" "}
                <code>{t("schedule.scheduleAssignments")}</code>, {t("schedule.timeOffAvailabilityVendorVisitsThenRefresh")}
              </>
            }
          />
        ) : schedulingError ? (
          <FeatureErrorState
            title={t("schedule.schedulingDataUnavailable")}
            description={statusDescription}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={retryDisabled}
              >
                {t("schedule.retry")}
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
                {t("schedule.retry")}
              </Button>
            </div>
          </Alert>
        ) : null}

        <ScheduleReadinessPanel
          locationFilter={sanitizedLocationFilter}
          onAction={handleReadinessAction}
          onOpenAvailability={(view) => openPanel("availability", view)}
          role={schedulingRole}
          hoursSummary={hoursSummary}
        />

        <div className="mt-1.5 flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <EnhancedCalendarView
                locationFilter={sanitizedLocationFilter}
                onOpenPanel={openPanel}
                onAutoScheduleClick={() => setShowAutoScheduler(true)}
                actionsDisabled={actionsDisabled}
                readOnly={!canBuildSchedule}
                profileId={schedulingRole.profileId}
                onSuggestFills={handleSuggestFills}
                smartFillOpen={canBuildSchedule ? smartFill.open : undefined}
                onToggleSmartFill={canBuildSchedule ? smartFill.toggle : undefined}
              />
            </Suspense>
          </div>

          {canBuildSchedule && (
            <div
              className={cn(
                "min-h-0 shrink-0 overflow-hidden",
                smartFill.inline ? "ml-2 w-[300px]" : "w-0",
              )}
            >
              <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <SmartFillSidebar
                  locationFilter={sanitizedLocationFilter}
                  expandTrigger={smartFillTrigger}
                  open={smartFill.open}
                  useDrawer={!smartFill.canInline}
                  onOpenChange={smartFill.setOpen}
                />
              </Suspense>
            </div>
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

      {canBuildSchedule && (
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
