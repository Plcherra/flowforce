// @ts-nocheck
import { useState, useCallback, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { AssignmentPanel } from '@/components/scheduling/drag-drop/AssignmentPanel';
import { ScheduleToolbar } from '@/components/scheduling/drag-drop/ScheduleToolbar';
import { WeekGrid } from '@/components/scheduling/drag-drop/WeekGrid';
import { ShiftDetailsPanel } from '@/components/scheduling/ShiftDetailsPanel';
import { ShiftWizardDialog } from '@/components/scheduling/ShiftWizardDialog';
import { WeekTemplateDialog } from '@/components/scheduling/WeekTemplateDialog';
import { ImportShiftsDialog } from '@/components/scheduling/ImportShiftsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useScheduleBoard } from '@/hooks/scheduling/useScheduleBoard';
import type {
  ShiftTemplate,
  VendorPaletteItem,
  PendingVendorEvent,
  VendorFormState,
  AIRecommendation,
} from './drag-drop/types';

interface DragDropScheduleCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  locationFilter?: string;
}

const roleTemplates: ShiftTemplate[] = [
  { id: '1', name: 'Barista Morning', role: 'Barista', color: '#f59e0b', startTime: '06:00', endTime: '14:00', minStaff: 2, maxStaff: 4 },
  { id: '2', name: 'Barista Evening', role: 'Barista', color: '#f59e0b', startTime: '14:00', endTime: '22:00', minStaff: 2, maxStaff: 3 },
  { id: '3', name: 'Runner Peak', role: 'Runner', color: '#3b82f6', startTime: '11:00', endTime: '15:00', minStaff: 1, maxStaff: 2 },
  { id: '4', name: 'Cashier All Day', role: 'Cashier', color: '#10b981', startTime: '08:00', endTime: '20:00', minStaff: 1, maxStaff: 2 },
  { id: '5', name: 'FOH Supervisor', role: 'Supervisor', color: '#8b5cf6', startTime: '09:00', endTime: '21:00', minStaff: 1, maxStaff: 1 },
  { id: '6', name: 'Cook Morning', role: 'Cook', color: '#ef4444', startTime: '05:00', endTime: '13:00', minStaff: 1, maxStaff: 2 },
  { id: '7', name: 'Cook Evening', role: 'Cook', color: '#ef4444', startTime: '13:00', endTime: '21:00', minStaff: 1, maxStaff: 2 },
];

const vendorPalette: VendorPaletteItem[] = [
  { id: 'vendor-ecolab', label: 'Ecolab Service', vendorType: 'ecolab', color: '#0ea5e9', defaultDurationHours: 2 },
  { id: 'vendor-electric', label: 'Electrician', vendorType: 'electrician', color: '#f97316', defaultDurationHours: 3 },
  { id: 'vendor-cleaning', label: 'Cleaning Crew', vendorType: 'cleaning', color: '#22c55e', defaultDurationHours: 4 },
  { id: 'vendor-inspection', label: 'Health Inspection', vendorType: 'inspection', color: '#a855f7', defaultDurationHours: 2 },
];

const vendorPaletteMap = new Map(vendorPalette.map((item) => [item.vendorType, item]));

const getVendorLabel = (vendorType: string) => vendorPaletteMap.get(vendorType)?.label ?? vendorType.replace(/_/g, ' ');

const getVendorColor = (vendorType: string) => vendorPaletteMap.get(vendorType)?.color ?? '#2563eb';

const toSqlTime = (value: string) => {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
};

export function DragDropScheduleCalendar({ selectedDate, onDateChange, locationFilter }: DragDropScheduleCalendarProps) {
  const { toast } = useToast();
  const [draggedVendor, setDraggedVendor] = useState<VendorPaletteItem | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [pendingVendorEvent, setPendingVendorEvent] = useState<PendingVendorEvent | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorFormState>({
    locationId: '',
    notes: '',
    shiftId: '',
    startTime: '',
    endTime: '',
  });
  const [draggedTemplate, setDraggedTemplate] = useState<ShiftTemplate | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [showShiftSheet, setShowShiftSheet] = useState(false);
  // Simplify to a single "By Staff" view (no time view toggle)
  const [showTemplates, setShowTemplates] = useState(false);
  const [showWeekTemplates, setShowWeekTemplates] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [showImportShifts, setShowImportShifts] = useState(false);
  const [showMultiAdd, setShowMultiAdd] = useState(false);
  const [showAddUnavailability, setShowAddUnavailability] = useState(false);
  const [showAddTimeOff, setShowAddTimeOff] = useState(false);
  // Multi-add state
  const [multiTitle, setMultiTitle] = useState('Shift');
  const [multiStart, setMultiStart] = useState('09:00');
  const [multiEnd, setMultiEnd] = useState('17:00');
  const [multiDays, setMultiDays] = useState<number[]>([]); // 0..6 (Sun..Sat)
  const [multiHeadcount, setMultiHeadcount] = useState(1);
  // Unavailability state
  const [uaUserId, setUaUserId] = useState<string>('');
  const [uaStart, setUaStart] = useState(''); // datetime-local
  const [uaEnd, setUaEnd] = useState('');
  const [uaReason, setUaReason] = useState('');
  // Time off state
  const [toUserId, setToUserId] = useState<string>('');
  const [toType, setToType] = useState<'vacation' | 'sick' | 'personal' | 'other'>('vacation');
  const [toStartDate, setToStartDate] = useState(''); // date
  const [toEndDate, setToEndDate] = useState('');
  const [toReason, setToReason] = useState('');
  const [minimizedView, setMinimizedView] = useState(false);
  const [showDailyInfo, setShowDailyInfo] = useState(true);
  // Weekly summary moved to header; no footer bar

  const {
    employees,
    timeOffRequests,
    unavailability: unavailabilityList,
    vendorEvents,
    vendorEventsThisWeek,
    weekSchedules,
    weekStart,
    weekDays,
    locations,
    candidateVendorShifts,
    unassignedShifts,
    vendorEventsByShift,
    disabledDates,
    weekCsvContent,
    weekCsvFilename,
    loading,
    actions,
  } = useScheduleBoard({ selectedDate, locationFilter, pendingVendorEvent });

  const {
    createSchedule,
    updateSchedule,
    assign,
    unassign,
    createVendorEvent,
    addUnavailability: addUnavailabilityAction,
    requestTimeOff: requestTimeOffAction,
    bulkCreateShifts: bulkCreateShiftsAction,
    generateRecommendations: generateRecommendationsAction,
    refetchAll,
    autoFillWeek: autoFillWeekAction,
    copyPreviousWeek: copyPreviousWeekAction,
    clearCurrentWeek: clearCurrentWeekAction,
    publishWeekStatus: publishWeekStatusAction,
  } = actions;

  useEffect(() => {
    if (!pendingVendorEvent) {
      setVendorForm((prev) => ({
        locationId: prev.locationId || locations[0]?.id || '',
        notes: '',
        shiftId: '',
        startTime: '',
        endTime: '',
      }));
      return;
    }

    const startTime = format(pendingVendorEvent.start, 'HH:mm');
    const endTime = format(pendingVendorEvent.end, 'HH:mm');
    const preferredShift = candidateVendorShifts[0]?.id ?? '';
    setVendorForm(() => ({
      locationId: locations[0]?.id || '',
      notes: '',
      shiftId: preferredShift,
      startTime,
      endTime,
    }));
  }, [candidateVendorShifts, locations, pendingVendorEvent]);

  useEffect(() => {
    if (!vendorModalOpen) {
      setPendingVendorEvent(null);
      setVendorForm({ locationId: locations[0]?.id || '', notes: '', shiftId: '', startTime: '', endTime: '' });
    }
  }, [locations, vendorModalOpen]);

  const handleTemplateDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    setDraggedVendor(null);
    setDraggedTemplate(template);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleVendorDragStart = (e: React.DragEvent, vendor: VendorPaletteItem) => {
    setDraggedTemplate(null);
    setDraggedVendor(vendor);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnUserDay = useCallback(async (event: React.DragEvent, day: Date, userId: string) => {
    event.preventDefault();

    if (draggedTemplate) {
      const startHour = Number.parseInt(draggedTemplate.startTime.split(':')[0] ?? '9', 10);
      const endHour = Number.parseInt(draggedTemplate.endTime.split(':')[0] ?? '17', 10);
      const startTime = new Date(day);
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(day);
      endTime.setHours(endHour, 0, 0, 0);

      try {
        const newSchedule = await createSchedule({
          title: draggedTemplate.name,
          role: draggedTemplate.role,
          color: draggedTemplate.color,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: '',
          is_all_day: false,
          timezone: 'UTC',
          required_headcount: draggedTemplate.minStaff,
          notes: null,
          break_minutes: 30,
          hourly_rate: 15.0,
          is_published: false,
          is_template: false,
          template_id: null,
          position_id: null,
          status: 'scheduled',
          user_id: null,
          requirements: [],
        });

        if (!newSchedule?.id) {
          throw new Error('Failed to create shift');
        }

        const success = await assign(newSchedule.id, userId);
        if (!success) {
          throw new Error('Unable to assign teammate to shift.');
        }

        await refetchAll();

        toast({
          title: 'Shift created and assigned!',
          description: `${draggedTemplate.name} → ${format(day, 'EEE, MMM d')}`,
        });
      } catch (error) {
        toast({
          title: 'Error creating shift',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setDraggedTemplate(null);
      }
      return;
    }

    if (draggedVendor) {
      const startTime = new Date(day);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + draggedVendor.defaultDurationHours);
      setPendingVendorEvent({ vendor: draggedVendor, start: startTime, end: endTime });
      setVendorModalOpen(true);
      setDraggedVendor(null);
    }
  }, [assign, createSchedule, draggedTemplate, draggedVendor, refetchAll, toast]);

  const handleUnassignedDrop = useCallback(async (event: React.DragEvent, day: Date) => {
    event.preventDefault();

    if (draggedTemplate) {
      const startHour = Number.parseInt(draggedTemplate.startTime.split(':')[0] ?? '9', 10);
      const endHour = Number.parseInt(draggedTemplate.endTime.split(':')[0] ?? '17', 10);
      const startTime = new Date(day);
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(day);
      endTime.setHours(endHour, 0, 0, 0);

      try {
        const newSchedule = await createSchedule({
          title: draggedTemplate.name,
          role: draggedTemplate.role,
          color: draggedTemplate.color,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: '',
          is_all_day: false,
          timezone: 'UTC',
          required_headcount: draggedTemplate.minStaff,
          notes: null,
          break_minutes: 30,
          hourly_rate: 15.0,
          is_published: false,
          is_template: false,
          template_id: null,
          position_id: null,
          status: 'scheduled',
          user_id: null,
          requirements: [],
        });

        if (!newSchedule?.id) {
          throw new Error('Failed to create shift');
        }

        await refetchAll();
        toast({
          title: 'Shift created!',
          description: `${draggedTemplate.name} added to ${format(day, 'EEE, MMM d')}`,
        });
      } catch (error) {
        toast({
          title: 'Error creating shift',
          description: error instanceof Error ? error.message : 'Please try again',
          variant: 'destructive',
        });
      } finally {
        setDraggedTemplate(null);
      }
      return;
    }

    if (draggedVendor) {
      const startTime = new Date(day);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + draggedVendor.defaultDurationHours);
      setPendingVendorEvent({ vendor: draggedVendor, start: startTime, end: endTime });
      setVendorModalOpen(true);
      setDraggedVendor(null);
    }
  }, [createSchedule, draggedTemplate, draggedVendor, refetchAll, toast]);

  const handleBoardDrop = useCallback(
    (event: React.DragEvent, day: Date, employeeId?: string) => {
      if (employeeId) {
        void handleDropOnUserDay(event, day, employeeId);
      } else {
        void handleUnassignedDrop(event, day);
      }
    },
    [handleDropOnUserDay, handleUnassignedDrop],
  );

  const openShiftDetails = (scheduleId: string) => {
    setSelectedShift(scheduleId);
    setShowShiftSheet(true);
  };

  const generateAIRecommendations = async (scheduleId: string) => {
    const recommendations = await generateRecommendationsAction(scheduleId);
    if (recommendations.length > 0) {
      setAIRecommendations(recommendations);
      setShowAIRecommendations(true);
      setSelectedShift(scheduleId);
    }
  };

  const handleTimeOffTypeChange = useCallback(
    (value: string) => {
      if (value === 'vacation' || value === 'sick' || value === 'personal' || value === 'other') {
        setToType(value);
      }
    },
    [setToType],
  );

  const exportWeekCsv = useCallback(() => {
    if (!weekCsvContent) return;
    const blob = new Blob([weekCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = weekCsvFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [weekCsvContent, weekCsvFilename]);

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Loading schedule...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-72 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <AssignmentPanel
        showTemplates={showTemplates}
        templates={roleTemplates}
        vendors={vendorPalette}
        onTemplateDragStart={handleTemplateDragStart}
        onVendorDragStart={handleVendorDragStart}
        onAutoFillWeek={autoFillWeekAction}
        onQuickVendorVisit={async () => {
          try {
            await createVendorEvent({
              vendor_type: 'general',
              event_date: selectedDate.toISOString().split('T')[0],
              start_time: '09:00',
              end_time: '10:00',
              notes: 'Quick vendor visit',
            });
          } catch (error) {
            toast({ title: 'Failed to log vendor visit', variant: 'destructive' });
          }
        }}
        showAIRecommendations={showAIRecommendations}
        aiRecommendations={aiRecommendations}
        onAssignFromAI={(recommendation) =>
          toast({
            title: 'Staff assigned!',
            description: `${recommendation.name} has been assigned to this shift`,
          })
        }
      />

      {/* Calendar Grid */}
      <Card className="flex-1">
        <ScheduleToolbar
          weekStart={weekStart}
          selectedDate={selectedDate}
          weekSchedules={weekSchedules}
          minimizedView={minimizedView}
          showDailyInfo={showDailyInfo}
          onDateChange={onDateChange}
          onToggleTemplates={() => setShowTemplates((value) => !value)}
          onOpenWeekTemplates={() => setShowWeekTemplates(true)}
          onCopyPreviousWeek={copyPreviousWeekAction}
          onAutoFillWeek={autoFillWeekAction}
          onClearWeek={clearCurrentWeekAction}
          onPublishWeek={publishWeekStatusAction}
          onExportWeekCsv={exportWeekCsv}
          onOpenAddShift={() => setShowAddShift(true)}
          onOpenMultiAdd={() => setShowMultiAdd(true)}
          onOpenImportShifts={() => setShowImportShifts(true)}
          onOpenAddUnavailability={() => setShowAddUnavailability(true)}
          onOpenAddTimeOff={() => setShowAddTimeOff(true)}
          onPrintWeek={() => window.print()}
          setMinimizedView={setMinimizedView}
          setShowDailyInfo={setShowDailyInfo}
        />
        <CardContent className="p-0">
          <WeekGrid
            weekDays={weekDays}
            employees={employees}
            weekSchedules={weekSchedules}
            unassignedShifts={unassignedShifts}
            vendorEvents={vendorEventsThisWeek}
            vendorEventsByShift={vendorEventsByShift}
            disabledDates={disabledDates}
            onShiftClick={openShiftDetails}
            onDrop={handleBoardDrop}
            onDragOver={handleDragOver}
            getVendorLabel={getVendorLabel}
            getVendorColor={getVendorColor}
          />
        </CardContent>
      </Card>

      {/* Week Template Dialog */}
      <WeekTemplateDialog open={showWeekTemplates} onOpenChange={setShowWeekTemplates} selectedDate={selectedDate} />

      {/* Shift Details Sheet */}
      {selectedShift && (
        <Sheet open={showShiftSheet} onOpenChange={setShowShiftSheet}>
          <SheetContent side="right" className="sm:max-w-xl w-full p-0">
            <ShiftDetailsPanel shiftId={selectedShift} onClose={() => setShowShiftSheet(false)} />
          </SheetContent>
        </Sheet>
      )}

      {/* Add Shift Dialog */}
      <ShiftWizardDialog open={showAddShift} onOpenChange={setShowAddShift} selectedDate={selectedDate} />

      {/* Import Shifts Dialog */}
      <ImportShiftsDialog open={showImportShifts} onOpenChange={setShowImportShifts} />

      {/* Add Multiple Shifts Dialog */}
      <Dialog open={showMultiAdd} onOpenChange={setShowMultiAdd}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Multiple Shifts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="mtitle">Title</Label>
              <Input id="mtitle" value={multiTitle} onChange={(e) => setMultiTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="time" value={multiStart} onChange={(e) => setMultiStart(e.target.value)} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={multiEnd} onChange={(e) => setMultiEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Days of this week</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {weekDays.map((d, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    size="sm"
                    variant={multiDays.includes(idx) ? 'default' : 'outline'}
                    onClick={() => setMultiDays(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                  >
                    {format(d, 'EEE')}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Required headcount</Label>
              <Input type="number" min={1} value={multiHeadcount} onChange={(e) => setMultiHeadcount(parseInt(e.target.value) || 1)} className="w-32" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowMultiAdd(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  const startParts = multiStart.split(':');
                  const endParts = multiEnd.split(':');
                  const payloads = multiDays.map((index) => {
                    const day = weekDays[index];
                    const start = new Date(day);
                    start.setHours(Number.parseInt(startParts[0] ?? '9', 10), Number.parseInt(startParts[1] ?? '0', 10), 0, 0);
                    const end = new Date(day);
                    end.setHours(Number.parseInt(endParts[0] ?? '17', 10), Number.parseInt(endParts[1] ?? '0', 10), 0, 0);
                    return {
                      title: multiTitle,
                      role: 'Staff',
                      color: '#3b82f6',
                      start_time: start.toISOString(),
                      end_time: end.toISOString(),
                      location: locationFilter ?? '',
                      is_all_day: false,
                      timezone: 'UTC',
                      required_headcount: multiHeadcount,
                      notes: null,
                      break_minutes: 30,
                      hourly_rate: 15.0,
                      is_published: false,
                      is_template: false,
                      template_id: null,
                      position_id: null,
                      status: 'scheduled',
                      user_id: null,
                      requirements: [],
                    } satisfies Parameters<typeof createSchedule>[0];
                  });

                  const success = await bulkCreateShiftsAction(payloads);
                  if (success) {
                    setShowMultiAdd(false);
                    setMultiDays([]);
                  }
                }}
                disabled={multiDays.length === 0}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Unavailability */}
      <Dialog open={showAddUnavailability} onOpenChange={setShowAddUnavailability}>
        <DialogContent className="sm:max-w-[520px] z-50 bg-background">
          <DialogHeader>
            <DialogTitle>Add Unavailability</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>User</Label>
              <Select value={uaUserId} onValueChange={setUaUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                 <SelectContent className="z-50 bg-background border shadow-lg">
                   {employees.map(u => (
                     <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={uaStart} onChange={(e) => setUaStart(e.target.value)} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="datetime-local" value={uaEnd} onChange={(e) => setUaEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input value={uaReason} onChange={(e) => setUaReason(e.target.value)} placeholder="e.g., class, appointment" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddUnavailability(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!uaUserId || !uaStart || !uaEnd) return;
                  const success = await addUnavailabilityAction({
                    userId: uaUserId,
                    start: new Date(uaStart).toISOString(),
                    end: new Date(uaEnd).toISOString(),
                    reason: uaReason || null,
                  });
                  if (success) {
                    setShowAddUnavailability(false);
                    setUaUserId('');
                    setUaStart('');
                    setUaEnd('');
                    setUaReason('');
                  }
                }}
                disabled={!uaUserId || !uaStart || !uaEnd}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Time Off */}
      <Dialog open={showAddTimeOff} onOpenChange={setShowAddTimeOff}>
        <DialogContent className="sm:max-w-[520px] z-50 bg-background">
          <DialogHeader>
            <DialogTitle>Add Time Off</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>User</Label>
              <Select value={toUserId} onValueChange={setToUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                 <SelectContent className="z-50 bg-background border shadow-lg">
                   {employees.map(u => (
                     <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={toStartDate} onChange={(e) => setToStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={toEndDate} onChange={(e) => setToEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={toType} onValueChange={handleTimeOffTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent className="z-50 bg-background border shadow-lg">
                     <SelectItem value="vacation">Vacation</SelectItem>
                     <SelectItem value="sick">Sick</SelectItem>
                     <SelectItem value="personal">Personal</SelectItem>
                     <SelectItem value="other">Other</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason</Label>
                <Input value={toReason} onChange={(e) => setToReason(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddTimeOff(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!toUserId || !toStartDate || !toEndDate) return;
                  const success = await requestTimeOffAction({
                    userId: toUserId,
                    startDate: new Date(toStartDate).toISOString(),
                    endDate: new Date(toEndDate).toISOString(),
                    type: toType,
                    reason: toReason || null,
                  });
                  if (success) {
                    setShowAddTimeOff(false);
                    setToUserId('');
                    setToStartDate('');
                    setToEndDate('');
                    setToReason('');
                    setToType('vacation');
                  }
                }}
                disabled={!toUserId || !toStartDate || !toEndDate}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vendor Event Modal */}
      <Dialog open={vendorModalOpen} onOpenChange={setVendorModalOpen}>
        <DialogContent className="sm:max-w-[520px] z-50 bg-background">
          <DialogHeader>
            <DialogTitle>Schedule Vendor Visit</DialogTitle>
          </DialogHeader>
          {pendingVendorEvent ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vendor</Label>
                  <Input value={getVendorLabel(pendingVendorEvent.vendor.vendorType)} disabled />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input value={format(pendingVendorEvent.start, 'yyyy-MM-dd')} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start time</Label>
                  <Input
                    type="time"
                    value={vendorForm.startTime}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End time</Label>
                  <Input
                    type="time"
                    value={vendorForm.endTime}
                    onChange={(e) => setVendorForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Select
                  value={vendorForm.locationId}
                  onValueChange={(value) => setVendorForm((prev) => ({ ...prev, locationId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-lg">
                    {locations.length === 0 ? (
                      <SelectItem value="" disabled>
                        No locations available
                      </SelectItem>
                    ) : (
                      locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Link to shift (optional)</Label>
                <Select
                  value={vendorForm.shiftId}
                  onValueChange={(value) => setVendorForm((prev) => ({ ...prev, shiftId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-lg max-h-60 overflow-y-auto">
                    <SelectItem value="">
                      No linked shift
                    </SelectItem>
                    {candidateVendorShifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {`${shift.title || shift.role || 'Shift'} • ${format(new Date(shift.start_time), 'HH:mm')} - ${format(new Date(shift.end_time), 'HH:mm')}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Preparation details, contact, etc."
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setVendorModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!pendingVendorEvent) return;
                    try {
                      await createVendorEvent({
                        vendor_type: pendingVendorEvent.vendor.vendorType,
                        event_date: format(pendingVendorEvent.start, 'yyyy-MM-dd'),
                        start_time: toSqlTime(vendorForm.startTime) ?? toSqlTime(format(pendingVendorEvent.start, 'HH:mm')),
                        end_time: toSqlTime(vendorForm.endTime) ?? toSqlTime(format(pendingVendorEvent.end, 'HH:mm')),
                        location_id: vendorForm.locationId || null,
                        shift_id: vendorForm.shiftId || null,
                        notes: vendorForm.notes || null,
                      });
                      setVendorModalOpen(false);
                    } catch (err) {
                      toast({ title: 'Failed to schedule vendor', variant: 'destructive' });
                    }
                  }}
                  disabled={!vendorForm.startTime || !vendorForm.endTime}
                >
                  Save visit
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a time slot to schedule a vendor visit.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Weekly summary footer removed; summary now in header */}
    </div>
  );
}
