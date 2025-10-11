import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';
import { useScheduling } from '@/contexts/SchedulingContext';
import { usePositions } from '@/hooks/usePositions';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useQueryClient } from '@tanstack/react-query';
import { parse, differenceInMinutes } from 'date-fns';
import { DetailsTab } from './shift-wizard/DetailsTab';
import { UsersTab } from './shift-wizard/UsersTab';
import { TasksTab } from './shift-wizard/TasksTab';
import { NotesTab } from './shift-wizard/NotesTab';
import type { ShiftTask, ShiftWizardFormData } from './shift-wizard/types';
import { queryKeys } from '@/lib/queryKeys';

interface ShiftWizardDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate: Date;
  children?: ReactNode;
}

const DEFAULT_BREAK = {
  id: '1',
  start_minutes: 240,
  duration_minutes: 30,
  is_paid: false,
  title: 'Lunch Break',
} as const;

const timezoneFallback = 'America/New_York';

const createDefaultFormState = (date: Date): ShiftWizardFormData => ({
  title: '',
  date,
  is_all_day: false,
  start_time: '09:30',
  end_time: '17:00',
  timezone: timezoneFallback,
  location: '',
  job_position_id: '',
  job_position_input: '',
  required_headcount: 1,
  assigned_users: [],
  can_claim: false,
  breaks: [
    {
      ...DEFAULT_BREAK,
      id: Date.now().toString(),
    },
  ],
  notes: '',
  attachments: [],
  tasks: [],
});

export function ShiftWizardDialog({ open, onOpenChange, selectedDate, children }: ShiftWizardDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState<ShiftWizardFormData>(() => createDefaultFormState(selectedDate));
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { profile } = useProfile();
  const userMetadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataCompanyId =
    typeof userMetadata['company_id'] === 'string' ? (userMetadata['company_id'] as string) : null;
  const companyId = profile?.companyId ?? metadataCompanyId ?? null;

  const { positions } = usePositions();
  const {
    employees,
    loading: employeesLoading,
    getEmployeesByPosition,
    getEmployeeFullName,
  } = useEmployees();
  const {
    shifts,
    weekRange,
    unavailability,
    refetchAll,
    mutations: { createSchedule, assign },
  } = useScheduling();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setFormData((prev) => ({ ...prev, date: selectedDate }));
    }
  }, [open, selectedDate]);

  const distinctLocations = useMemo(
    () =>
      Array.from(
        new Set((shifts ?? []).map((shift) => shift.location).filter((value): value is string => Boolean(value))),
      ),
    [shifts],
  );

  const hours = useMemo(() => {
    if (formData.is_all_day) {
      return { total: 24, net: 24 };
    }

    const start = parse(formData.start_time, 'HH:mm', formData.date);
    const end = parse(formData.end_time, 'HH:mm', formData.date);
    const totalMinutes = differenceInMinutes(end, start);
    const unpaidBreakMinutes = formData.breaks.filter((item) => !item.is_paid).reduce((sum, item) => sum + item.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    const netHours = (totalMinutes - unpaidBreakMinutes) / 60;

    return { total: totalHours, net: netHours };
  }, [formData.breaks, formData.date, formData.end_time, formData.is_all_day, formData.start_time]);

  const unavailabilityEntries = useMemo(
    () =>
      (unavailability ?? []).map((entry) => ({
        user_id: entry.user_id ?? null,
        start_time: entry.start_time,
        end_time: entry.end_time,
      })),
    [unavailability],
  );

  const getShiftWindow = () => {
    const date = formData.date;
    const start = formData.is_all_day
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0)
      : parse(formData.start_time, 'HH:mm', date);
    const end = formData.is_all_day
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59)
      : parse(formData.end_time, 'HH:mm', date);
    return { start, end };
  };

  const isUserAvailableForWindow = (userId: string) => {
    const { start, end } = getShiftWindow();
    const items = unavailabilityEntries.filter((entry) => entry.user_id === userId);
    return !items.some((entry) => {
      const uaStart = new Date(entry.start_time);
      const uaEnd = new Date(entry.end_time);
      return uaStart < end && uaEnd > start;
    });
  };

  const resetForm = () => {
    setFormData(createDefaultFormState(selectedDate));
    setActiveTab('details');
  };

  const handleAssignUsers = async (shiftId: string) => {
    if (!assign) return;
    const assignments = formData.assigned_users ?? [];
    if (assignments.length === 0) return;

    for (const userId of assignments) {
      try {
        await assign(shiftId, userId);
      } catch (err) {
        console.error('Failed to assign user to shift', err);
      }
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!createSchedule) return;

    setLoading(true);
    try {
      const { start, end } = getShiftWindow();

      const payload = {
        title: formData.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: formData.location,
        is_all_day: formData.is_all_day,
        timezone: formData.timezone,
        required_headcount: formData.required_headcount,
        notes: formData.notes,
        break_minutes: formData.breaks.reduce((sum, item) => sum + item.duration_minutes, 0),
        hourly_rate: 15.0,
        color: '#3b82f6',
        is_published: publish,
        is_template: false,
        template_id: null,
        position_id: formData.job_position_id || null,
        role: 'Staff',
        status: 'scheduled',
        user_id: null,
        requirements: [],
      } satisfies Parameters<typeof createSchedule>[0];

      const created = await createSchedule(payload);
      if (created) {
        await handleAssignUsers(created.id);

        if (companyId && weekRange?.start && weekRange?.end) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.shifts(companyId, weekRange.start, weekRange.end) }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.assignments(companyId, weekRange.start, weekRange.end),
            }),
          ]);
        }

        await refetchAll();
        onOpenChange?.(false);
        resetForm();
      }
    } catch (err) {
      console.error('Failed to create shift', err);
    } finally {
      setLoading(false);
    }
  };

  const onAddTask = (task: ShiftTask) => {
    setFormData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const onRemoveTask = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        onOpenChange?.(value);
        resetForm();
      } else {
        onOpenChange?.(value);
      }
    }}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="w-[95vw] max-w-3xl max-h-[88vh] p-0 overflow-hidden">
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave(true);
          }}
        >
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Create New Shift</DialogTitle>
            <DialogDescription>Set up a new shift with detailed scheduling options.</DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="flex-1 overflow-hidden px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <div className="mt-4 flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto pr-1">
                  <TabsContent value="details" className="mt-0 space-y-4">
                    <DetailsTab
                      formData={formData}
                      setFormData={setFormData}
                      positions={positions}
                      distinctLocations={distinctLocations}
                      hours={hours}
                    />
                  </TabsContent>

                  <TabsContent value="users" className="mt-0 space-y-4">
                    <UsersTab
                      employees={employees}
                      employeesLoading={employeesLoading}
                      getEmployeesByPosition={getEmployeesByPosition}
                      getEmployeeFullName={getEmployeeFullName}
                      formData={formData}
                      setFormData={setFormData}
                      isUserAvailableForWindow={isUserAvailableForWindow}
                    />

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-claim"
                        checked={formData.can_claim}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, can_claim: checked }))}
                      />
                      <Label htmlFor="can-claim">Enable users to claim this shift</Label>
                    </div>

                    {formData.job_position_id && (
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4" />
                              <span className="text-sm text-muted-foreground">
                                {getEmployeesByPosition(formData.job_position_id).length} users are qualified for{' '}
                                {positions.find((position) => position.id === formData.job_position_id)?.name}
                              </span>
                            </div>
                            <Badge variant="secondary">
                              {positions.find((position) => position.id === formData.job_position_id)?.name}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="tasks" className="mt-0 space-y-4">
                    <TasksTab tasks={formData.tasks as ShiftTask[]} onAddTask={onAddTask} onRemoveTask={onRemoveTask} />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0 space-y-4">
                    <NotesTab notes={formData.notes} onNotesChange={(notes) => setFormData((prev) => ({ ...prev, notes }))} />
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange?.(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleSave(false)}
                >
                  {loading ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Publishing...' : 'Publish'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
