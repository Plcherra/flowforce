import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Brain, 
  Users, 
  Settings, 
  BarChart3, 
  Zap, 
  Clock,
  Smartphone,
  CheckSquare
} from 'lucide-react';
import { DragDropScheduleCalendar } from './DragDropScheduleCalendar';
import { SchedulingCalendar } from './SchedulingCalendar';
import { EnhancedCalendarView } from './EnhancedCalendarView';
import { AIInsightsDashboard } from './AIInsightsDashboard';
import { WeeklySchedulingChecklist } from './WeeklySchedulingChecklist';
import { SchedulingWorkflow } from './SchedulingWorkflow';
import { SchedulingNotifications } from './SchedulingNotifications';
import { StaffShiftManagement } from './StaffShiftManagement';
import { ComplianceMonitor } from './ComplianceMonitor';
import { MobileStaffInterface } from './MobileStaffInterface';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutoScheduleDialog } from './AutoScheduleDialog';
import { useProfile } from '@/hooks/useProfile';
import { useScheduling } from '@/contexts/SchedulingContext';

export function NextGenSchedulingSystem({ locationFilter }: { locationFilter?: string }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('schedule');
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAutoScheduler, setShowAutoScheduler] = useState(false);
  const { profile } = useProfile();
  const {
    shifts,
    assignments,
    timeOffRequests,
    vendorEvents,
    weekRange,
    error: schedulingError,
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
    companyId: profile?.companyId ?? profile?.company_id ?? 'unknown',
    weekRange: { start: weekRangeStartIso, end: weekRangeEndIso },
    counts: {
      shifts: shifts.length,
      assignments: assignments.length,
      timeOff: timeOffRequests.length,
      vendorEvents: vendorEvents.length,
    },
  };
  const lastApiError = schedulingError ?? 'none';

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
      id: 'mobile',
      label: 'Mobile View',
      icon: Smartphone,
      description: 'Staff mobile interface'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {isManager && (
        <div className="border-b border-amber-200/60 bg-amber-50/70">
          <div className="container mx-auto px-4 py-3 text-[11px] font-mono leading-relaxed text-amber-900">
            <div className="flex items-center justify-between gap-2 text-amber-700">
              <span className="text-xs font-semibold uppercase tracking-wide">Scheduling Debug</span>
              <span className="text-[10px]">Manager view only</span>
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs" data-testid="scheduling-debug-json">
              {JSON.stringify(debugPayload, null, 2)}
            </pre>
            <div className="mt-2 text-xs" data-testid="scheduling-debug-error">
              <span className="font-semibold text-amber-700">lastError:</span>{' '}
              {lastApiError && lastApiError.trim().length > 0 ? lastApiError : 'none'}
            </div>
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
              <Button size="sm" className="flex items-center gap-2" onClick={() => setShowAutoScheduler(true)}>
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

          <TabsContent value="mobile">
            <MobileStaffInterface />
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
