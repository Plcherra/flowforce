import { useMemo, useState } from 'react';
import { format } from 'date-fns';
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
} from 'lucide-react';
import { EnhancedCalendarView } from './EnhancedCalendarView';
import { AIInsightsDashboard } from './AIInsightsDashboard';
import { WeeklySchedulingChecklist } from './WeeklySchedulingChecklist';
import { SchedulingWorkflow } from './SchedulingWorkflow';
import { SchedulingNotifications } from './SchedulingNotifications';
import { StaffShiftManagement } from './StaffShiftManagement';
import { PersonalAvailabilityPanel } from './availability/PersonalAvailabilityPanel';
import { TeamAvailabilityPanel } from './availability/TeamAvailabilityPanel';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { useProfile } from '@/hooks/useProfile';
import { useScheduling } from '@/contexts/SchedulingContext';

export function NextGenSchedulingSystem({ locationFilter }: { locationFilter?: string }) {
  const [activeTab, setActiveTab] = useState('schedule');
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
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
  } = useScheduling();

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

  const hoursSummary = useMemo(() => {
    const filterValue = locationFilter?.toLowerCase().trim() ?? null;
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
  }, [assignments, locationFilter, shifts]);

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
      .map(([day, hours]) => ({ day, hours }))
      .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
  }, [hoursSummary.dailyHours]);

  const appliedFilterLabel = locationFilter
    ? `Filtered by: ${locationFilter}`
    : 'All scheduled locations';

  const tabs = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      description: 'Month, week, and staff grid views'
    },
    {
      id: 'analytics',
      label: 'AI Insights',
      icon: Brain,
      description: 'Performance analytics and recommendations'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: Users,
      description: 'Shift swapping and availability'
    },
    {
      id: 'workflow',
      label: 'Automation',
      icon: Settings,
      description: 'Automated workflows and reminders'
    },
    {
      id: 'availability',
      label: 'Availability',
      icon: Clock,
      description: 'Personal and team availability tools'
    }
  ];

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
      {isManager && (
        <div className="border-b border-amber-200/60 bg-amber-50/70">
          <div className="container mx-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-900">
            <div className="flex flex-wrap items-center justify-between gap-3 text-amber-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide">Scheduling Debug</span>
                {isFallbackData && (
                  <span className="rounded-full bg-amber-200 px-2 py-[2px] text-[10px] font-semibold text-amber-900">
                    Preview data
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px]">Manager view only</span>
                <button
                  type="button"
                  onClick={() => setShowDebugPanel((prev) => !prev)}
                  className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 transition hover:text-amber-900"
                >
                  {showDebugPanel ? 'Hide details' : 'Show details'}
                </button>
              </div>
            </div>
            {showDebugPanel && (
              <>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs" data-testid="scheduling-debug-json">
                  {JSON.stringify(debugPayload, null, 2)}
                </pre>
                <div className="mt-2 text-xs" data-testid="scheduling-debug-error">
                  <span className="font-semibold text-amber-700">lastError:</span>{' '}
                  {lastApiError && lastApiError.trim().length > 0 ? lastApiError : 'none'}
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Hour Summary</CardTitle>
                <CardDescription>{appliedFilterLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      {hoursSummary.averageShiftHours > 0 ? hoursSummary.averageShiftHours.toFixed(1) : '0.0'} hrs
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
                      <p className="text-xs text-muted-foreground">
                        Filled vs in-progress vs open
                      </p>
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
                      {dailyHourEntries.map(({ day, hours }) => (
                        <div key={day} className="rounded-lg border border-border/60 p-3">
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(`${day}T00:00:00`), 'EEE, MMM d')}
                          </p>
                          <p className="mt-1 text-lg font-semibold">{hours.toFixed(1)} hrs</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex-1">
              <EnhancedCalendarView />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AIInsightsDashboard />
          </TabsContent>

          <TabsContent value="staff">
            <StaffShiftManagement />
          </TabsContent>

          <TabsContent value="workflow" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SchedulingWorkflow />
              <SchedulingNotifications />
            </div>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <PersonalAvailabilityPanel />
            <TeamAvailabilityPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Checklist Modal */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Weekly Scheduling Checklist</DialogTitle>
          </DialogHeader>
          <WeeklySchedulingChecklist />
        </DialogContent>
      </Dialog>

      <AutoScheduleDialog
        open={showAutoScheduler}
        onOpenChange={setShowAutoScheduler}
        defaultLocationId={locationFilter ?? undefined}
      />
    </div>
  );
}
