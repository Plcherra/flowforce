import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calendar,
  Brain,
  Users,
  Settings,
  BarChart3,
  Zap,
  Clock,
  CheckSquare,
  AlertTriangle,
  Bug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Phase 4: Lazy load heavy scheduling components for better initial bundle size
const EnhancedCalendarView = lazy(() => import('./EnhancedCalendarView').then(m => ({ default: m.EnhancedCalendarView })));
const AIInsightsDashboard = lazy(() => import('./AIInsightsDashboard').then(m => ({ default: m.AIInsightsDashboard })));
const WeeklySchedulingChecklist = lazy(() => import('./WeeklySchedulingChecklist').then(m => ({ default: m.WeeklySchedulingChecklist })));
const SchedulingWorkflow = lazy(() => import('./SchedulingWorkflow').then(m => ({ default: m.SchedulingWorkflow })));
const SchedulingNotifications = lazy(() => import('./SchedulingNotifications').then(m => ({ default: m.SchedulingNotifications })));
const StaffShiftManagement = lazy(() => import('./StaffShiftManagement').then(m => ({ default: m.StaffShiftManagement })));
const PersonalAvailabilityPanel = lazy(() => import('./availability/PersonalAvailabilityPanel').then(m => ({ default: m.PersonalAvailabilityPanel })));
const TeamAvailabilityPanel = lazy(() => import('./availability/TeamAvailabilityPanel').then(m => ({ default: m.TeamAvailabilityPanel })));
const CopilotSchedulerSidebar = lazy(() => import('./CopilotSchedulerSidebar').then(m => ({ default: m.CopilotSchedulerSidebar })));

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { useProfile } from '@/hooks/useProfile';
import { useScheduling } from '@/contexts/SchedulingContext';
import { useSearchParams } from '@/lib/router-adapter';
import { appEnv } from '@/lib/env';

export const formatDailyHoursLabel = (day: string, parsedDate?: Date) => {
  const date = parsedDate ?? parseISO(day);
  if (Number.isNaN(date.getTime())) {
    return day;
  }

  return format(date, 'EEE, MMM d');
};

export function NextGenSchedulingSystem({ locationFilter }: { locationFilter?: string }) {
  const tabs = useMemo(
    () => [
      {
        id: 'schedule',
        label: 'Schedule',
        icon: Calendar,
        description: 'Month, week, and staff grid views',
      },
      {
        id: 'analytics',
        label: 'AI Insights',
        icon: Brain,
        description: 'Performance analytics and recommendations',
      },
      {
        id: 'staff',
        label: 'Staff Management',
        icon: Users,
        description: 'Shift swapping and availability',
      },
      {
        id: 'workflow',
        label: 'Automation',
        icon: Settings,
        description: 'Automated workflows and reminders',
      },
      {
        id: 'availability',
        label: 'Availability',
        icon: Clock,
        description: 'Personal and team availability tools',
      },
    ],
    [],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = searchParams.get('tab');
    return requestedTab && tabs.some((tab) => tab.id === requestedTab) ? requestedTab : 'schedule';
  });
  const [availabilityView, setAvailabilityView] = useState<'personal' | 'team'>(() => {
    const requestedView = searchParams.get('availability');
    return requestedView === 'team' ? 'team' : 'personal';
  });
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [showDebugDialog, setShowDebugDialog] = useState(false);
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

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab && tabs.some((tab) => tab.id === requestedTab)) {
      if (requestedTab !== activeTab) {
        setActiveTab(requestedTab);
      }
    } else if (!requestedTab && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [activeTab, searchParams, tabs]);

  useEffect(() => {
    const requestedView = searchParams.get('availability');
    setAvailabilityView(requestedView === 'team' ? 'team' : 'personal');
  }, [searchParams]);

  const isManager = useMemo(() => {
    const role = (profile?.role ?? '').toLowerCase();
    return ['manager', 'admin', 'company_admin', 'owner'].includes(role);
  }, [profile?.role]);

  const weekRangeStartIso = weekRange?.start ? weekRange.start.toISOString() : null;
  const weekRangeEndIso = weekRange?.end ? weekRange.end.toISOString() : null;
  const debugPayload = {
    userId: profile?.userId ?? 'anonymous',
    role: profile?.role ?? 'unknown',
    companyId: profile?.companyId ?? 'unknown',
    weekRange: { start: weekRangeStartIso, end: weekRangeEndIso },
    counts: {
      shifts: shifts.length,
      assignments: assignments.length,
      timeOff: timeOff.length,
      vendorEvents: vendorEvents.length,
    },
  };
  const lastApiError = schedulingError ?? 'none';

  const sanitizedLocationFilter = useMemo(() => {
    if (!locationFilter) return undefined;
    const normalized = locationFilter.toLowerCase().trim();
    return availableLocations.some((loc) => loc.toLowerCase() === normalized) ? locationFilter : undefined;
  }, [availableLocations, locationFilter]);

  const hoursSummary = useMemo(() => {
    const filterValue = sanitizedLocationFilter?.toLowerCase().trim() ?? null;
    const filteredShifts = filterValue
      ? shifts.filter((shift) => {
          const locationName = (shift.location ?? '').toLowerCase();
          const locationId = (shift as { location_id?: string }).location_id;
          return (
            locationName === filterValue ||
            locationName.includes(filterValue) ||
            (typeof locationId === 'string' && locationId.toLowerCase() === filterValue)
          );
        })
      : shifts;

    const dailyHours: Record<string, number> = {};
    let totalHours = 0;
    let totalLaborHours = 0;
    let filledCount = 0;
    let partialCount = 0;
    let unfilledCount = 0;

    filteredShifts.forEach((shift) => {
      const start = shift.start_time ? new Date(shift.start_time) : null;
      const end = shift.end_time ? new Date(shift.end_time) : null;
      if (!start || !end) return;
      const diffMs = end.getTime() - start.getTime();
      if (Number.isNaN(diffMs) || diffMs <= 0) return;
      const hours = diffMs / 36e5;
      const headcount = shift.required_headcount ?? 1;
      const laborHours = hours * headcount;

      totalHours += hours;
      totalLaborHours += laborHours;

      const dayKey = start.toISOString().split('T')[0] ?? 'unknown';
      dailyHours[dayKey] = (dailyHours[dayKey] ?? 0) + hours;

      const assignedCount = Array.isArray(shift.assignments)
        ? shift.assignments.length
        : assignments.filter((assignment) => assignment.schedule_id === shift.id).length;

      if (assignedCount >= headcount) {
        filledCount += 1;
      } else if (assignedCount > 0) {
        partialCount += 1;
      } else {
        unfilledCount += 1;
      }
    });

    const shiftCount = filteredShifts.length;
    const averageShiftHours = shiftCount > 0 ? totalHours / shiftCount : 0;

    return {
      totalHours,
      totalLaborHours,
      averageShiftHours,
      shiftCount,
      dailyHours,
      filledCount,
      partialCount,
      unfilledCount,
    };
  }, [assignments, sanitizedLocationFilter, shifts]);

  const coveragePercentages = useMemo(() => {
    const total = hoursSummary.shiftCount || 1;
    const filledPct = (hoursSummary.filledCount / total) * 100;
    const partialPct = (hoursSummary.partialCount / total) * 100;
    const openPct = (hoursSummary.unfilledCount / total) * 100;
    return {
      filledPct,
      partialPct,
      openPct,
    };
  }, [
    hoursSummary.filledCount,
    hoursSummary.partialCount,
    hoursSummary.shiftCount,
    hoursSummary.unfilledCount,
  ]);

  const dailyHourEntries = useMemo(() => {
    return Object.entries(hoursSummary.dailyHours)
      .map(([day, hours]) => {
        const parsedDate = parseISO(day);
        const timestamp = parsedDate.getTime();
        if (Number.isNaN(timestamp)) {
          return null;
        }

        return {
          day,
          hours,
          parsedDate,
          label: formatDailyHoursLabel(day, parsedDate),
        };
      })
      .filter((entry): entry is { day: string; hours: number; parsedDate: Date; label: string } => entry !== null)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  }, [hoursSummary.dailyHours]);

  const appliedFilterLabel = sanitizedLocationFilter
    ? `Filtered by: ${sanitizedLocationFilter}`
    : 'All scheduled locations';

  const advancedFeaturesDisabled = Boolean(isFallbackData || schedulingError);
  const showDebugTools = appEnv.DEV || isManager;

  const handleTabChange = (value: string) => {
    if (value !== activeTab) {
      setActiveTab(value);
    }
    const nextParams = new URLSearchParams(searchParams.toString());
    if (value === 'schedule') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', value);
    }

    if (value === 'availability') {
      if (availabilityView === 'team') {
        nextParams.set('availability', 'team');
      } else {
        nextParams.delete('availability');
      }
    } else {
      nextParams.delete('availability');
    }

    if (locationFilter) {
      nextParams.set('location', locationFilter);
    } else {
      nextParams.delete('location');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const handleAvailabilityViewChange = (value: string) => {
    const normalizedValue = value === 'team' ? 'team' : 'personal';
    setAvailabilityView(normalizedValue);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', 'availability');
    if (normalizedValue === 'team') {
      nextParams.set('availability', 'team');
    } else {
      nextParams.delete('availability');
    }

    if (locationFilter) {
      nextParams.set('location', locationFilter);
    } else {
      nextParams.delete('location');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const showStatusAlert = Boolean(schedulingError) || isFallbackData;
  const statusTitle = isFallbackData ? 'Viewing demo scheduling data' : 'Scheduling data unavailable';
  const statusDescription = isFallbackData
    ? 'Live scheduling data could not be reached. Preview data is displayed and scheduling actions are temporarily disabled.'
    : schedulingError ?? 'An unexpected error occurred while loading scheduling data.';
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
              <Button size="sm" variant="outline" onClick={() => setShowChecklist(true)}>
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
        {showStatusAlert && (
          <Alert variant={isFallbackData ? 'default' : 'destructive'} className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{statusTitle}</AlertTitle>
            <AlertDescription>{statusDescription}</AlertDescription>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleRetry} disabled={retryDisabled}>
                Retry
              </Button>
            </div>
          </Alert>
        )}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Enhanced Tab Navigation */}
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-5 w-full min-w-[520px] h-auto p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id}
                    className="flex flex-col items-center gap-1 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-center text-xs font-medium">{tab.label}</div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="schedule">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(280px,1fr)]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Hour Summary</CardTitle>
                    <CardDescription>{appliedFilterLabel}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-28 w-full" />
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Scheduled Hours</p>
                            <p className="text-2xl font-semibold">
                              {hoursSummary.totalHours > 0 ? hoursSummary.totalHours.toFixed(1) : '0.0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Labor Hours (with headcount)</p>
                            <p className="text-2xl font-semibold">
                              {hoursSummary.totalLaborHours > 0 ? hoursSummary.totalLaborHours.toFixed(1) : '0.0'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average Shift Length</p>
                            <p className="text-2xl font-semibold">
                              {hoursSummary.averageShiftHours > 0
                                ? hoursSummary.averageShiftHours.toFixed(1)
                                : '0.0'}{' '}
                              hrs
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Shifts Counted</p>
                            <p className="text-2xl font-semibold">{hoursSummary.shiftCount}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/60 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Shift Coverage</p>
                              <p className="text-xs text-muted-foreground">Filled vs in-progress vs open</p>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Filled&nbsp;({hoursSummary.filledCount})
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                Partial&nbsp;({hoursSummary.partialCount})
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                Open&nbsp;({hoursSummary.unfilledCount})
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div className="flex h-full w-full">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${coveragePercentages.filledPct}%` }}
                              />
                              <div
                                className="h-full bg-amber-500 transition-all"
                                style={{ width: `${coveragePercentages.partialPct}%` }}
                              />
                              <div
                                className="h-full bg-rose-500 transition-all"
                                style={{ width: `${coveragePercentages.openPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="mb-3 text-sm font-medium text-muted-foreground">Daily Scheduled Hours</p>
                          {dailyHourEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No shifts scheduled for this period.</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {dailyHourEntries.map(({ day, hours, label }) => (
                                <div key={day} className="rounded-lg border border-border/60 p-3">
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="mt-1 text-lg font-semibold">{hours.toFixed(1)} hrs</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <EnhancedCalendarView locationFilter={sanitizedLocationFilter} />
              </div>
              <CopilotSchedulerSidebar locationFilter={sanitizedLocationFilter} />
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
                  <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                    <PersonalAvailabilityPanel />
                  </Suspense>
                </TabsContent>
                <TabsContent value="team" className="mt-0 space-y-6">
                  <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
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
                  Live scheduling data is unavailable. Scheduling actions are temporarily read-only.
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-md border bg-muted/50 p-3">
              <pre className="whitespace-pre-wrap break-words text-xs" data-testid="scheduling-debug-json">
                {JSON.stringify(debugPayload, null, 2)}
              </pre>
            </div>
            <div className="text-xs" data-testid="scheduling-debug-error">
              <span className="font-semibold">Last error:</span>{' '}
              {lastApiError && lastApiError.trim().length > 0 ? lastApiError : 'none'}
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

interface FeatureUnavailableCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}

function FeatureUnavailableCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: FeatureUnavailableCardProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} disabled={disabled}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
