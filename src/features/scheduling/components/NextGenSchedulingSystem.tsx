import { useState, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Bug,
  Calendar,
  CheckSquare,
  Clock,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useScheduling } from "@/contexts/SchedulingContext";
import { appEnv } from "@/lib/env";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  getSupabaseSetupMessage,
  isMissingBackendResourceError,
} from "@/shared/utils/supabaseErrors";
import { SCHEDULING_TABS } from "@/features/scheduling/types/tabs";
import { useSchedulingTabs } from "@/features/scheduling/hooks/useSchedulingTabs";
import { useHoursSummary } from "@/features/scheduling/hooks/useHoursSummary";
import { sanitizeLocationFilter } from "@/features/scheduling/utils/locationFilter";
import {
  WeeklyHourSummary,
  FeatureUnavailableCard,
  SchedulingHeader,
} from "@/features/scheduling/components";

// Phase 4: Lazy load heavy scheduling components for better initial bundle size
const EnhancedCalendarView = lazy(() =>
  import("./EnhancedCalendarView").then((m) => ({
    default: m.EnhancedCalendarView,
  })),
);
const AIInsightsDashboard = lazy(() =>
  import("./AIInsightsDashboard").then((m) => ({
    default: m.AIInsightsDashboard,
  })),
);
const WeeklySchedulingChecklist = lazy(() =>
  import("./WeeklySchedulingChecklist").then((m) => ({
    default: m.WeeklySchedulingChecklist,
  })),
);
const SchedulingWorkflow = lazy(() =>
  import("./SchedulingWorkflow").then((m) => ({
    default: m.SchedulingWorkflow,
  })),
);
const SchedulingNotifications = lazy(() =>
  import("./SchedulingNotifications").then((m) => ({
    default: m.SchedulingNotifications,
  })),
);
const StaffShiftManagement = lazy(() =>
  import("./StaffShiftManagement").then((m) => ({
    default: m.StaffShiftManagement,
  })),
);
const PersonalAvailabilityPanel = lazy(() =>
  import("./availability/PersonalAvailabilityPanel").then((m) => ({
    default: m.PersonalAvailabilityPanel,
  })),
);
const TeamAvailabilityPanel = lazy(() =>
  import("./availability/TeamAvailabilityPanel").then((m) => ({
    default: m.TeamAvailabilityPanel,
  })),
);
const CopilotSchedulerSidebar = lazy(() =>
  import("./CopilotSchedulerSidebar").then((m) => ({
    default: m.CopilotSchedulerSidebar,
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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutoScheduleDialog } from "./AutoScheduleDialog";

export function NextGenSchedulingSystem({
  locationFilter,
}: {
  locationFilter?: string;
}) {
  const { profile } = useProfile();
  const {
    shifts,
    assignments,
    timeOff,
    vendorEvents,
    weekRange,
    error: schedulingError,
    loading,
    refetchAll,
    isFallbackData,
    availableLocations,
  } = useScheduling();

  const sanitizedLocationFilter = sanitizeLocationFilter(
    locationFilter,
    availableLocations,
  );

  const {
    activeTab,
    availabilityView,
    handleTabChange,
    handleAvailabilityViewChange,
  } = useSchedulingTabs({ locationFilter: sanitizedLocationFilter });

  const { hoursSummary, coveragePercentages, dailyHourEntries } =
    useHoursSummary({
      shifts,
      assignments,
      locationFilter: sanitizedLocationFilter,
    });

  const [showChecklist, setShowChecklist] = useState(false);
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
  const isManager = ["manager", "admin", "company_admin", "owner"].includes(
    (profile?.role ?? "").toLowerCase(),
  );

  const weekRangeStartIso = weekRange?.start
    ? weekRange.start.toISOString()
    : null;
  const weekRangeEndIso = weekRange?.end ? weekRange.end.toISOString() : null;
  const debugPayload = {
    userId: profile?.userId ?? "anonymous",
    role: profile?.role ?? "unknown",
    companyId: profile?.companyId ?? "unknown",
    weekRange: { start: weekRangeStartIso, end: weekRangeEndIso },
    counts: {
      shifts: shifts.length,
      assignments: assignments.length,
      timeOff: timeOff.length,
      vendorEvents: vendorEvents.length,
    },
  };
  const lastApiError = schedulingError ?? "none";

  const appliedFilterLabel = sanitizedLocationFilter
    ? `Filtered by: ${sanitizedLocationFilter}`
    : "All scheduled locations";

  const advancedFeaturesDisabled = Boolean(isFallbackData || schedulingError);
  const showDebugTools = appEnv.DEV || isManager;
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                Next-Gen Scheduling System
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                AI Enhanced
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Analytics Ready
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Real-time
              </Badge>
              {showDebugTools && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setShowDebugDialog(true)}
                >
                  <Bug className="h-3 w-3" />
                  Diagnostics
                </Button>
              )}
              <Button
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setShowAutoScheduler(true)}
                disabled={actionsDisabled}
              >
                <Zap className="h-3 w-3" />
                Auto-Schedule Week
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowChecklist(true)}
              >
                <CheckSquare className="h-3 w-3 mr-2" />
                Checklist
              </Button>
            </div>
          </div>
          {showDebugTools && (
            <div className="mt-4 flex items-center gap-2 md:hidden">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowDebugDialog(true)}
              >
                <Bug className="h-4 w-4" />
                Diagnostics
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto p-4">
        {schedulingSetupMissing ? (
          <FeatureSetupRequiredState
            title="Scheduling module is not fully set up yet"
            description={getSupabaseSetupMessage(
              schedulingError,
              "Scheduling",
            )}
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
            className="mb-6"
          />
        ) : showStatusAlert ? (
          <Alert
            variant={isFallbackData ? "default" : "destructive"}
            className="mb-6"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{statusTitle}</AlertTitle>
            <AlertDescription>{statusDescription}</AlertDescription>
            <div className="mt-4 flex flex-wrap gap-2">
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
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {/* Enhanced Tab Navigation */}
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-5 w-full min-w-[520px] h-auto p-1">
              {SCHEDULING_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-center text-xs font-medium">
                      {tab.label}
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="schedule">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(280px,1fr)]">
              <div className="space-y-6">
                <WeeklyHourSummary
                  hoursSummary={hoursSummary}
                  coveragePercentages={coveragePercentages}
                  dailyHourEntries={dailyHourEntries}
                  appliedFilterLabel={appliedFilterLabel}
                  loading={loading}
                />

                <EnhancedCalendarView
                  locationFilter={sanitizedLocationFilter}
                />
              </div>
              <CopilotSchedulerSidebar
                locationFilter={sanitizedLocationFilter}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            {advancedFeaturesDisabled ? (
              <FeatureUnavailableCard
                icon={Brain}
                title="AI Insights unavailable"
                description="Connect live scheduling data to unlock AI-powered recommendations and analytics."
                actionLabel="Retry data sync"
                onAction={handleRetry}
                disabled={retryDisabled}
              />
            ) : (
              <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                <AIInsightsDashboard />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="staff">
            {advancedFeaturesDisabled ? (
              <FeatureUnavailableCard
                icon={Users}
                title="Staff management disabled"
                description="We need real-time staff data to process swaps and time-off requests."
                actionLabel="Retry data sync"
                onAction={handleRetry}
                disabled={retryDisabled}
              />
            ) : (
              <StaffShiftManagement />
            )}
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            {advancedFeaturesDisabled ? (
              <FeatureUnavailableCard
                icon={Settings}
                title="Automation paused"
                description="Automations and reminders resume once scheduling data is back online."
                actionLabel="Retry data sync"
                onAction={handleRetry}
                disabled={retryDisabled}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                  <SchedulingWorkflow />
                </Suspense>
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                  <SchedulingNotifications />
                </Suspense>
              </div>
            )}
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            {advancedFeaturesDisabled ? (
              <FeatureUnavailableCard
                icon={Clock}
                title="Availability preview mode"
                description="Employee availability updates are read-only until the live connection is restored."
                actionLabel="Retry data sync"
                onAction={handleRetry}
                disabled={retryDisabled}
              />
            ) : (
              <Tabs
                value={availabilityView}
                onValueChange={handleAvailabilityViewChange}
                className="space-y-4"
              >
                <div className="overflow-x-auto">
                  <TabsList className="grid min-w-[320px] grid-cols-2 sm:w-auto">
                    <TabsTrigger value="personal">My Availability</TabsTrigger>
                    <TabsTrigger value="team">Manage Availability</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="personal" className="mt-0 space-y-6">
                  <Suspense
                    fallback={<Skeleton className="h-[500px] w-full" />}
                  >
                    <PersonalAvailabilityPanel />
                  </Suspense>
                </TabsContent>
                <TabsContent value="team" className="mt-0 space-y-6">
                  <Suspense
                    fallback={<Skeleton className="h-[500px] w-full" />}
                  >
                    <TeamAvailabilityPanel />
                  </Suspense>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Checklist Modal */}
      <Dialog open={showDebugDialog} onOpenChange={setShowDebugDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Scheduling Diagnostics</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isFallbackData && (
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Preview data in use</AlertTitle>
                <AlertDescription>
                  Live scheduling data is unavailable. Scheduling actions are
                  temporarily read-only.
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-md border bg-muted/50 p-3">
              <pre
                className="whitespace-pre-wrap break-words text-xs"
                data-testid="scheduling-debug-json"
              >
                {JSON.stringify(debugPayload, null, 2)}
              </pre>
            </div>
            <div className="text-xs" data-testid="scheduling-debug-error">
              <span className="font-semibold">Last error:</span>{" "}
              {lastApiError && lastApiError.trim().length > 0
                ? lastApiError
                : "none"}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Weekly Scheduling Checklist</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <WeeklySchedulingChecklist />
          </Suspense>
        </DialogContent>
      </Dialog>

      <AutoScheduleDialog
        open={showAutoScheduler}
        onOpenChange={setShowAutoScheduler}
        defaultLocationId={sanitizedLocationFilter ?? undefined}
        companyId={profile?.companyId ?? undefined}
      />
    </div>
  );
}
