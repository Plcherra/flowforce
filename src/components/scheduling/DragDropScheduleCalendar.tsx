/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Users, Plus, Zap, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useScheduling } from '@/contexts/SchedulingContext';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';
import { useProfile } from '@/hooks/useProfile';
import { WeekTemplateDialog } from './WeekTemplateDialog';
import { AddShiftDialog } from './AddShiftDialog';
import { ImportShiftsDialog } from './ImportShiftsDialog';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ShiftDetailsPanel } from './ShiftDetailsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DragDropScheduleCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  locationFilter?: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  role: string;
  color: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  maxStaff: number;
}

interface VendorPaletteItem {
  id: string;
  label: string;
  vendorType: string;
  color: string;
  defaultDurationHours: number;
}

interface Schedule {
  id: string;
  title: string;
  role: string;
  color: string;
  start_time: string;
  end_time: string;
  assignments?: Array<{
    userId: string;
    userName: string;
    status: string;
  }>;
  assigned_users?: Array<{
    user_profile: {
      first_name: string;
      last_name: string;
    };
  }>;
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
  const {
    shifts,
    timeOffRequests,
    unavailability: unavailabilityList,
    vendorEvents,
    loading,
    createSchedule,
    updateSchedule,
    assign,
    unassign,
    createVendorEvent,
    refetchAll,
  } = useScheduling();
  const { employees } = useEmployees();
  const timeOff = timeOffRequests;
  const schedules = shifts;
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? null;

  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [draggedVendor, setDraggedVendor] = useState<VendorPaletteItem | null>(null);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [pendingVendorEvent, setPendingVendorEvent] = useState<{
    vendor: VendorPaletteItem;
    start: Date;
    end: Date;
  } | null>(null);
  const [vendorForm, setVendorForm] = useState({
    locationId: '',
    notes: '',
    shiftId: '',
    startTime: '',
    endTime: '',
  });
  const [draggedTemplate, setDraggedTemplate] = useState<ShiftTemplate | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [aiRecommendations, setAIRecommendations] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [showShiftSheet, setShowShiftSheet] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
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
  const [employeeQuery, setEmployeeQuery] = useState('');

  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
  const weekEnd = addDays(weekStart, 7);
  const vendorEventsThisWeek = useMemo(() => {
    return vendorEvents.filter((event) => {
      const timestamp = event.event_date;
      if (!timestamp) return false;
      const eventDate = new Date(timestamp);
      return eventDate >= weekStart && eventDate < weekEnd;
    });
  }, [vendorEvents, weekEnd, weekStart]);

  const candidateVendorShifts = useMemo(() => {
    if (!pendingVendorEvent) return [] as Schedule[];
    const eventStart = pendingVendorEvent.start;
    const eventEnd = pendingVendorEvent.end;
    return schedules
      .filter((schedule: Schedule) => {
        const scheduleStart = new Date(schedule.start_time);
        const scheduleEnd = new Date(schedule.end_time);
        return isSameDay(scheduleStart, eventStart) && scheduleStart < eventEnd && scheduleEnd > eventStart;
      })
      .sort((a: Schedule, b: Schedule) => {
        const priorityRoles = ['supervisor', 'manager'];
        const roleA = a.role?.toLowerCase?.() || '';
        const roleB = b.role?.toLowerCase?.() || '';
        const indexA = priorityRoles.indexOf(roleA);
        const indexB = priorityRoles.indexOf(roleB);
        if (indexA === indexB) {
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        }
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
  }, [pendingVendorEvent, schedules]);

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

  useEffect(() => {
    let isMounted = true;
    const loadLocations = async () => {
      if (!companyId) {
        setLocations([]);
        return;
      }
      const { data, error } = await supabase
        .from('inv_locations')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name', { ascending: true });
      if (error) {
        console.error('Failed to load locations', error);
        return;
      }
      if (isMounted) {
        setLocations(data ?? []);
      }
    };

    loadLocations();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Filter schedules for current week
  const filteredSchedules = schedules.filter(s => !locationFilter || (s.location || '') === locationFilter);
  const weekSchedules = filteredSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return weekDays.some(day => isSameDay(scheduleDate, day));
  });

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

  const handleDrop = useCallback(async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();

    if (draggedTemplate) {
      const startTime = new Date(day);
      startTime.setHours(hour, 0, 0, 0);
      const endHour = parseInt(draggedTemplate.endTime.split(':')[0]);
      const endTime = new Date(day);
      endTime.setHours(endHour, 0, 0, 0);

      try {
        await createSchedule({
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

        toast({
          title: 'Shift created!',
          description: `${draggedTemplate.name} added to ${format(day, 'EEE, MMM d')}`,
        });
      } catch (error) {
        toast({
          title: 'Error creating shift',
          description: 'Please try again',
          variant: 'destructive',
        });
      }

      setDraggedTemplate(null);
      return;
    }

    if (draggedVendor) {
      const startTime = new Date(day);
      startTime.setHours(hour, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + draggedVendor.defaultDurationHours);
      setPendingVendorEvent({ vendor: draggedVendor, start: startTime, end: endTime });
      setVendorModalOpen(true);
      setDraggedVendor(null);
    }
  }, [createSchedule, draggedTemplate, draggedVendor, toast]);

  const handleDropOnUserDay = useCallback(async (e: React.DragEvent, day: Date, userId: string) => {
    e.preventDefault();

    if (draggedTemplate) {
      const startHour = parseInt(draggedTemplate.startTime.split(':')[0]);
      const endHour = parseInt(draggedTemplate.endTime.split(':')[0]);

      const startTime = new Date(day);
      startTime.setHours(startHour, 0, 0, 0);
      const endTime = new Date(day);
      endTime.setHours(endHour, 0, 0, 0);

      try {
        const { data: newSchedule, error } = await createSchedule({
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
        } as any);

        if (error || !newSchedule?.id) throw error || new Error('Failed to create shift');

        await assign(newSchedule.id, userId);

        toast({
          title: 'Shift created and assigned!',
          description: `${draggedTemplate.name} → ${format(day, 'EEE, MMM d')}`,
        });
      } catch (err) {
        toast({
          title: 'Error creating shift',
          description: 'Please try again',
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
  }, [assign, createSchedule, draggedTemplate, draggedVendor, toast]);

  const getSchedulesForTimeSlot = (day: Date, hour: number) => {
    return weekSchedules.filter(schedule => {
      const scheduleStart = new Date(schedule.start_time);
      const scheduleEnd = new Date(schedule.end_time);
      const slotTime = new Date(day);
      slotTime.setHours(hour, 0, 0, 0);
      
      return isSameDay(scheduleStart, day) && 
             scheduleStart.getHours() <= hour && 
             scheduleEnd.getHours() > hour;
    });
  };

  const getDayStats = (day: Date) => {
    const daySchedules = weekSchedules.filter(s => isSameDay(new Date(s.start_time), day));
    const totalMinutes = daySchedules.reduce((sum, s: any) => {
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      return sum + Math.max(0, differenceInMinutes(end, start));
    }, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const required = daySchedules.reduce((sum, s: any) => sum + (s.required_headcount || 1), 0);
    const assigned = daySchedules.reduce((sum, s: any) => sum + ((s.assignments?.length) || 0), 0);
    const ratio = required > 0 ? Math.min(1, assigned / required) : 0;
    return { totalHours, required, assigned, ratio };
  };

  const openShiftDetails = (scheduleId: string) => {
    setSelectedShift(scheduleId);
    setShowShiftSheet(true);
  };

  const generateAIRecommendations = async (scheduleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-scheduling-assistant', {
        body: { 
          action: 'generate_recommendations', 
          data: { scheduleId, companyId: 'current' } 
        }
      });
      
      if (error) throw error;
      setAIRecommendations(data.recommendations);
      setShowAIRecommendations(true);
      setSelectedShift(scheduleId);
    } catch (error) {
      toast({
        title: "AI recommendations unavailable",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const autoFillWeek = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-scheduling-assistant', {
        body: { 
          action: 'auto_schedule', 
          data: { 
            companyId: 'current',
            weekStart: format(weekStart, 'yyyy-MM-dd'),
            preferences: { balance: true, fairness: true }
          } 
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "AI Schedule Generated!",
        description: `Created ${data.schedule.shifts.length} optimized shifts`,
      });
    } catch (error) {
      toast({
        title: "Auto-scheduling failed",
        description: "Please try manual scheduling",
        variant: "destructive",
      });
    }
  };

  const copyPreviousWeek = async () => {
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekDays = Array.from({ length: 7 }, (_, i) => addDays(prevWeekStart, i));
    const prevWeekSchedules = filteredSchedules.filter(s => {
      const d = new Date(s.start_time);
      return prevWeekDays.some(day => isSameDay(d, day));
    });
    try {
      await Promise.all(
        prevWeekSchedules.map(async (s: any) => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          const newStart = addDays(start, 7);
          const newEnd = addDays(end, 7);
          await createSchedule({
            ...s,
            id: undefined as any,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            is_published: false,
          } as any);
        })
      );
      toast({ title: 'Copied previous week', description: `Duplicated ${prevWeekSchedules.length} shifts` });
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Unable to copy previous week', variant: 'destructive' });
    }
  };

  const clearWeek = async () => {
    try {
      await Promise.all(
        weekSchedules.map(async (s: any) => {
          if (s.assignments?.length) {
            await Promise.all(
              s.assignments.map((assignment: any) => unassign(s.id, assignment.user_id))
            );
          }
          await supabase.from('schedules').delete().eq('id', s.id);
        })
      );
      if (companyId) {
        await supabase
          .from('vendor_event')
          .delete()
          .eq('company_id', companyId)
          .gte('event_date', format(weekStart, 'yyyy-MM-dd'))
          .lt('event_date', format(weekEnd, 'yyyy-MM-dd'));
      }
      await refetchAll();
      toast({ title: 'Week cleared' });
    } catch (e) {
      toast({ title: 'Clear failed', variant: 'destructive' });
    }
  };

  const publishWeek = async (published: boolean) => {
    try {
      await Promise.all(
        weekSchedules.map((s: any) => updateSchedule(s.id, { is_published: published } as any))
      );
      toast({ title: published ? 'Week published' : 'Week unpublished' });
    } catch (e) {
      toast({ title: 'Action failed', variant: 'destructive' });
    }
  };

  const exportWeekCsv = () => {
    const rows = [
      ['Title','Location','Start','End','Published','Required','Assigned'],
      ...weekSchedules.map((s: any) => [
        s.title || '',
        s.location || '',
        format(new Date(s.start_time), 'yyyy-MM-dd HH:mm'),
        format(new Date(s.end_time), 'yyyy-MM-dd HH:mm'),
        s.is_published ? 'Yes' : 'No',
        s.required_headcount || 1,
        s.assignments?.length || 0,
      ])
    ];
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schedule-week-${format(weekStart,'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      {/* Shift Templates Panel (toggleable) */}
      {showTemplates && (
      <Card className="lg:w-80 flex-shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Role Templates
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={autoFillWeek} className="flex-1 text-xs">
              <Zap className="h-3 w-3 mr-1" />
              AI Fill Week
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await createVendorEvent({
                    vendor_type: 'general',
                    event_date: selectedDate.toISOString().split('T')[0],
                    start_time: '09:00',
                    end_time: '10:00',
                    notes: 'Quick vendor visit',
                  });
                } catch (e) {
                  toast({ title: 'Failed to log vendor visit', variant: 'destructive' });
                }
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              Vendor Visit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {roleTemplates.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleTemplateDragStart(e, template)}
              className="p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
              style={{ borderLeftColor: template.color, borderLeftWidth: '4px' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{template.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {template.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {template.startTime} - {template.endTime}
                <Users className="h-3 w-3 ml-2" />
                {template.minStaff}-{template.maxStaff}
              </div>
            </div>
          ))}

          <div className="pt-4 mt-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Vendor Visits</h3>
              <Badge variant="outline">Drag to schedule</Badge>
            </div>
            {vendorPalette.map((vendor) => (
              <div
                key={vendor.id}
                draggable
                onDragStart={(e) => handleVendorDragStart(e, vendor)}
                className="p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/40 transition-colors"
                style={{ borderLeftColor: vendor.color, borderLeftWidth: '4px' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{vendor.label}</span>
                  <Badge variant="secondary" className="text-[10px]" style={{ backgroundColor: vendor.color, color: '#fff' }}>
                    Vendor
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default duration · {vendor.defaultDurationHours}h
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Calendar Grid */}
      <Card className="flex-1">
        <CalendarToolbar
          weekStart={weekStart}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          weekSchedules={weekSchedules}
          minimizedView={minimizedView}
          setMinimizedView={setMinimizedView}
          showDailyInfo={showDailyInfo}
          setShowDailyInfo={setShowDailyInfo}
          onToggleTemplates={() => setShowTemplates(v => !v)}
          onOpenWeekTemplates={() => setShowWeekTemplates(true)}
          onCopyPreviousWeek={copyPreviousWeek}
          onAutoFillWeek={autoFillWeek}
          onClearWeek={clearWeek}
          onPublishWeek={publishWeek}
          onExportWeekCsv={exportWeekCsv}
          onPrintWeek={() => window.print()}
          onOpenAddShift={() => setShowAddShift(true)}
          onOpenMultiAdd={() => setShowMultiAdd(true)}
          onOpenImportShifts={() => setShowImportShifts(true)}
          onOpenAddUnavailability={() => setShowAddUnavailability(true)}
          onOpenAddTimeOff={() => setShowAddTimeOff(true)}
        />
        <CardContent className="p-0">
          {
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header with days */}
                <div className="grid grid-cols-8 border-b bg-background relative z-10">
                  <div className="p-2 text-sm font-medium text-muted-foreground">
                    <div className="flex flex-col gap-1">
                      <span>Employee</span>
                      <input
                        className="w-full max-w-32 rounded border border-border px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Search users"
                        value={employeeQuery}
                        onChange={(e) => setEmployeeQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="p-2 text-center border-l">
                      <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                      <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-2 p-2 text-xs text-muted-foreground border-b">
                  <span>Vendor visits this week:</span>
                  <Badge variant="outline">{vendorEventsThisWeek.length}</Badge>
                </div>

                {weekSchedules.length === 0 ? (
                  <div className="flex h-64 items-center justify-center border-l border-r border-b text-muted-foreground">
                    <div className="text-center space-y-1">
                      <h3 className="text-sm font-medium">No shifts scheduled this week</h3>
                      <p className="text-xs">
                        Drag a template onto a day to create the first shift.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Unassigned shifts row */}
                    <div className="grid grid-cols-8 border-b bg-muted/20 relative z-0">
                      <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center">
                        Unassigned shifts
                      </div>
                  {weekDays.map((day) => {
                    const unassigned = schedules.filter((s: any) => isSameDay(new Date(s.start_time), day) && (!s.assignments || s.assignments.length === 0));
                    const unlinkedVendors = vendorEventsThisWeek.filter((event) => isSameDay(new Date(event.event_date), day) && !event.shift_id);
                    return (
                      <div key={`unassigned-${day.toISOString()}`} className="border-l border-r relative min-h-[48px] p-1">
                        <div className="flex flex-wrap gap-1">
                            {unassigned.map((u: any) => (
                              <div 
                                key={u.id} 
                                className="relative z-10 rounded px-2 py-1 text-[11px] bg-background border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
                                title={u.start_time && u.end_time ? `${u.title || 'Shift'} - ${format(new Date(u.start_time), 'HH:mm')} to ${format(new Date(u.end_time), 'HH:mm')}` : 'Invalid shift time'}
                                onClick={() => {
                                  setSelectedShift(u.id);
                                  setShowShiftSheet(true);
                                }}
                              >
                                <div className="font-medium truncate">
                                  {u.title || u.job_position?.name || 'Shift'}
                                </div>
                                <div className="text-xs opacity-75">
                                  {u.start_time && u.end_time ? 
                                    `${format(new Date(u.start_time), 'HH:mm')} - ${format(new Date(u.end_time), 'HH:mm')}` : 
                                    'Invalid time'
                                  }
                                </div>
                              </div>
                            ))}
                            {unlinkedVendors.map((event) => (
                              <div
                                key={event.id}
                                className="relative z-10 rounded-full px-2 py-1 text-[10px] font-medium"
                                style={{ backgroundColor: `${getVendorColor(event.vendor_type)}20`, color: getVendorColor(event.vendor_type) }}
                              >
                                Vendor · {getVendorLabel(event.vendor_type)}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                    {/* Staff grid by day */}
                    <div className="relative">
                      {employees
                        .filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(employeeQuery.toLowerCase()))
                        .map((emp) => (
                        <div key={emp.id} className="grid grid-cols-8 border-b min-h-[64px]">
                          {/* Employee cell */}
                          <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {emp.first_name?.[0]}
                                {emp.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{emp.first_name} {emp.last_name}</span>
                          </div>
                          {weekDays.map((day) => {
                            const shiftsForUserDay = schedules.filter((schedule: any) => {
                              const isSame = isSameDay(new Date(schedule.start_time), day);
                              const assigned = (schedule.assignments || []).some((a: any) => a.user_id === emp.id);
                              return isSame && assigned;
                            });
                        const d = new Date(day);
                        d.setHours(12, 0, 0, 0);

                        const hasApprovedTimeOff = timeOff.some((t: any) => {
                          if (t.user_id !== emp.id || t.status !== 'approved') return false;
                          const start = new Date(t.start_date || t.start_time || t.created_at);
                          const end = new Date(t.end_date || t.end_time || t.start_date || t.created_at);
                          return d >= start && d <= end;
                        });

                        const hasUnavailability = unavailabilityList.some((item) => {
                          if (item.user_id !== emp.id) return false;
                          const start = new Date(item.start_time);
                          const end = new Date(item.end_time);
                          return d >= start && d <= end;
                        });

                        const isUnavailable = hasApprovedTimeOff || hasUnavailability;

                            return (
                              <div
                                key={`${emp.id}-${day.toISOString()}`}
                                className="border-l border-r relative min-h-[64px] hover:bg-muted/20 transition-colors p-1"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnUserDay(e, day, emp.id)}
                              >
                                 {isUnavailable && (
                                   <div className="absolute inset-0 bg-red-100/80 text-red-700 text-[10px] flex items-start p-1 pointer-events-none z-5 border border-red-200">
                                     Unavailable • All day
                                   </div>
                                 )}
                                <div className="flex flex-wrap gap-1">
                                {shiftsForUserDay.map((schedule: any) => {
                                  const linkedVendors = vendorEventsThisWeek.filter((event) => event.shift_id === schedule.id);
                                  return (
                                  <div
                                    key={schedule.id}
                                    className="relative z-20 rounded px-2 py-1 text-[11px] cursor-pointer hover:shadow-md transition-all duration-200 bg-background border"
                                    style={{ 
                                      backgroundColor: (schedule.color || '#3b82f6') + '15',
                                      borderLeft: `3px solid ${schedule.color || '#3b82f6'}`
                                    }}
                                    title={schedule.start_time && schedule.end_time ? `${schedule.title || 'Shift'} - ${format(new Date(schedule.start_time), 'HH:mm')} to ${format(new Date(schedule.end_time), 'HH:mm')}` : 'Invalid shift time'}
                                    onClick={() => {
                                      setSelectedShift(schedule.id);
                                      setShowShiftSheet(true);
                                    }}
                                  >
                                    <div className="font-medium truncate">
                                      {schedule.title || schedule.job_position?.name || 'Shift'}
                                    </div>
                                    <div className="text-xs opacity-75">
                                      {schedule.start_time && schedule.end_time ? 
                                        `${format(new Date(schedule.start_time), 'HH:mm')} - ${format(new Date(schedule.end_time), 'HH:mm')}` : 
                                        'Invalid time'
                                      }
                                    </div>
                                    {linkedVendors.map((event) => (
                                      <div
                                        key={`${event.id}-chip`}
                                        className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                                        style={{ backgroundColor: `${getVendorColor(event.vendor_type)}15`, color: getVendorColor(event.vendor_type) }}
                                      >
                                        Vendor · {getVendorLabel(event.vendor_type)}
                                      </div>
                                    ))}
                                  </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {/* AI Recommendations Sidebar */}
      {showAIRecommendations && (
        <Card className="lg:w-80 flex-shrink-0 relative z-30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiRecommendations.slice(0, 5).map((rec, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{rec.name}</span>
                  <Badge variant={rec.score > 80 ? "default" : rec.score > 60 ? "secondary" : "outline"}>
                    {rec.score}%
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {rec.reasons?.map((reason: string, idx: number) => (
                    <div key={idx}>• {reason}</div>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-2" 
                  onClick={() => {
                    // Assign user to shift logic here
                    toast({
                      title: "Staff assigned!",
                      description: `${rec.name} has been assigned to this shift`,
                    });
                  }}
                >
                  Assign Staff
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
      <AddShiftDialog open={showAddShift} onOpenChange={setShowAddShift} selectedDate={selectedDate} />

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
                  try {
                    const startParts = multiStart.split(':');
                    const endParts = multiEnd.split(':');
                    for (const idx of multiDays) {
                      const day = weekDays[idx];
                      const start = new Date(day);
                      start.setHours(parseInt(startParts[0]||'9'), parseInt(startParts[1]||'0'), 0, 0);
                      const end = new Date(day);
                      end.setHours(parseInt(endParts[0]||'17'), parseInt(endParts[1]||'0'), 0, 0);
                      await createSchedule({
                        title: multiTitle,
                        role: 'Staff',
                        color: '#3b82f6',
                        start_time: start.toISOString(),
                        end_time: end.toISOString(),
                        location: locationFilter || '',
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
                        requirements: []
                      } as any);
                    }
                    toast({ title: 'Shifts created', description: `${multiDays.length} day(s)` });
                    setShowMultiAdd(false);
                    setMultiDays([]);
                  } catch (e) {
                    toast({ title: 'Failed to create shifts', description: 'Please try again', variant: 'destructive' });
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
                  try {
                    if (!uaUserId || !uaStart || !uaEnd) return;
                    const { data: authResult } = await supabase.auth.getUser();
                    await supabase.from('user_unavailability').insert({
                      user_id: uaUserId,
                      start_time: new Date(uaStart).toISOString(),
                      end_time: new Date(uaEnd).toISOString(),
                      reason: uaReason || 'unavailable',
                      is_recurring: false,
                      recurring_pattern: null,
                      created_by: authResult?.user?.id ?? 'system',
                    });
                    await refetchAll();
                    toast({ title: 'Unavailability added' });
                    setShowAddUnavailability(false);
                    setUaUserId('');
                    setUaStart('');
                    setUaEnd('');
                    setUaReason('');
                  } catch (e) {
                    toast({ title: 'Failed to add unavailability', variant: 'destructive' });
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
                <Select value={toType} onValueChange={(v) => setToType(v as any)}>
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
                  try {
                    if (!toUserId || !toStartDate || !toEndDate) return;
                    await supabase.from('time_off_requests').insert({
                      user_id: toUserId,
                      start_date: new Date(toStartDate).toISOString(),
                      end_date: new Date(toEndDate).toISOString(),
                      type: toType,
                      reason: toReason || 'time off',
                      status: 'pending',
                      notes: null,
                      approved_by: null,
                      approved_at: null,
                    });
                    await refetchAll();
                    toast({ title: 'Time off requested' });
                    setShowAddTimeOff(false);
                    setToUserId('');
                    setToStartDate('');
                    setToEndDate('');
                    setToReason('');
                    setToType('vacation');
                  } catch (e) {
                    toast({ title: 'Failed to request time off', variant: 'destructive' });
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
