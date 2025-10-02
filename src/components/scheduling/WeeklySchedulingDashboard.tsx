import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WeeklySchedulingChecklist } from './WeeklySchedulingChecklist';
import { SchedulingWorkflow } from './SchedulingWorkflow';
import { RoleTemplates } from './RoleTemplates';
import { SchedulingCalendar } from './SchedulingCalendar';
import { SchedulingProvider } from '@/contexts/SchedulingContext';
import { SchedulingNotifications } from './SchedulingNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { CheckSquare, Workflow, Users, Calendar, Bell } from 'lucide-react';
import { SchedulingCopilotPanel } from './SchedulingCopilotPanel';

export function WeeklySchedulingDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Weekly Scheduling System</h1>
        <p className="text-muted-foreground">
          Streamlined workflow for consistent and efficient staff scheduling
        </p>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            <span className="hidden sm:inline">Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Reminders</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
            <SchedulingCopilotPanel />
            <WeeklySchedulingChecklist />
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm mb-1">Send Reminder</div>
                      <div className="text-xs text-muted-foreground">Notify staff about availability</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm mb-1">Export Schedule</div>
                      <div className="text-xs text-muted-foreground">Download as PDF</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm mb-1">Share Schedule</div>
                      <div className="text-xs text-muted-foreground">Send to WhatsApp</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="font-medium text-sm mb-1">View Analytics</div>
                      <div className="text-xs text-muted-foreground">Scheduling insights</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">This Week</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Total Shifts</div>
                        <div className="text-xs text-muted-foreground">Scheduled this week</div>
                      </div>
                      <div className="text-2xl font-bold">24</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Coverage</div>
                        <div className="text-xs text-muted-foreground">All roles filled</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">98%</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">Staff Hours</div>
                        <div className="text-xs text-muted-foreground">Total scheduled</div>
                      </div>
                      <div className="text-2xl font-bold">152h</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <SchedulingWorkflow />
        </TabsContent>

        <TabsContent value="roles">
          <RoleTemplates />
        </TabsContent>

        <TabsContent value="notifications">
          <SchedulingNotifications />
        </TabsContent>

        <TabsContent value="calendar">
          <SchedulingProvider>
            <SchedulingCalendar />
          </SchedulingProvider>
        </TabsContent>
      </Tabs>
    </div>
  );
}
