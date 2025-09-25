import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, Users, Plus, Zap, BarChart3, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, differenceInHours, differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSchedules } from '@/hooks/scheduling/useSchedules';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';
import { useTimeOffRequests } from '@/hooks/useTimeOffRequests';
import { useUnavailability } from '@/hooks/scheduling/useUnavailability';
import { WeekTemplateDialog } from './WeekTemplateDialog';
import { AddShiftDialog } from './AddShiftDialog';
import { ImportShiftsDialog } from './ImportShiftsDialog';
import { CalendarToolbar } from './calendar/CalendarToolbar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ShiftDetailsPanel } from './ShiftDetailsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

export function DragDropScheduleCalendar({ selectedDate, onDateChange, locationFilter }: DragDropScheduleCalendarProps) {
  const { toast } = useToast();
  const { schedules, loading, createSchedule, updateSchedule, assignUserToShift } = useSchedules();
  const { employees } = useEmployees();
  const { requests: timeOff, createTimeOffRequest } = useTimeOffRequests();
  const { createUnavailability } = useUnavailability();
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

  // Filter schedules for current week
  const filteredSchedules = schedules.filter(s => !locationFilter || (s.location || '') === locationFilter);
  const weekSchedules = filteredSchedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return weekDays.some(day => isSameDay(scheduleDate, day));
  });

  const handleDragStart = (e: React.DragEvent, template: ShiftTemplate) => {
    setDraggedTemplate(template);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = useCallback(async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    
    if (!draggedTemplate) return;

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
        hourly_rate: 15.00,
        is_published: false,
        is_template: false,
        template_id: null,
        position_id: null,
        status: 'scheduled',
        user_id: null,
        requirements: []
      });

      toast({
        title: "Shift created!",
        description: `${draggedTemplate.name} added to ${format(day, 'EEE, MMM d')}`,
      });
    } catch (error) {
      toast({
        title: "Error creating shift",
        description: "Please try again",
        variant: "destructive",
      });
    }

    setDraggedTemplate(null);
  }, [draggedTemplate, createSchedule, toast]);

  const handleDropOnUserDay = useCallback(async (e: React.DragEvent, day: Date, userId: string) => {
    e.preventDefault();
    if (!draggedTemplate) return;

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
        requirements: []
      } as any);

      if (error || !newSchedule?.id) throw error || new Error('Failed to create shift');

      await assignUserToShift(newSchedule.id, userId);

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
  }, [draggedTemplate, createSchedule, assignUserToShift, toast]);

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
          await supabase.from('schedules').delete().eq('id', s.id);
        })
      );
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
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {roleTemplates.map((template) => (
            <div
              key={template.id}
              draggable
              onDragStart={(e) => handleDragStart(e, template)}
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

                {/* Unassigned shifts row */}
                <div className="grid grid-cols-8 border-b bg-muted/20 relative z-0">
                  <div className="p-2 text-xs font-medium text-muted-foreground border-r flex items-center">
                    Unassigned shifts
                  </div>
                  {weekDays.map((day) => {
                    const unassigned = schedules.filter((s: any) => isSameDay(new Date(s.start_time), day) && (!s.assignments || s.assignments.length === 0));
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
                        const isUnavailable = timeOff.some((t: any) => {
                          if (t.user_id !== emp.id || t.status !== 'approved') return false;
                          const start = new Date(t.start_date || t.start_time || t.created_at);
                          const end = new Date(t.end_date || t.end_time || t.start_date || t.created_at);
                          const d = new Date(day);
                          d.setHours(12,0,0,0);
                          return d >= start && d <= end;
                        });

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
                                {shiftsForUserDay.map((schedule: any) => (
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
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
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
                    await createUnavailability({
                      user_id: uaUserId,
                      start_time: new Date(uaStart).toISOString(),
                      end_time: new Date(uaEnd).toISOString(),
                      reason: uaReason || 'unavailable',
                      is_recurring: false,
                      recurring_pattern: null,
                      created_by: (await supabase.auth.getUser()).data.user?.id || 'system'
                    } as any);
                    toast({ title: 'Unavailability added' });
                    setShowAddUnavailability(false);
                    setUaUserId(''); setUaStart(''); setUaEnd(''); setUaReason('');
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
                    await createTimeOffRequest({
                      user_id: toUserId,
                      start_date: new Date(toStartDate).toISOString(),
                      end_date: new Date(toEndDate).toISOString(),
                      type: toType,
                      reason: toReason || 'time off',
                      status: 'pending',
                      notes: null,
                      approved_by: null,
                      approved_at: null,
                    } as any);
                    toast({ title: 'Time off requested' });
                    setShowAddTimeOff(false);
                    setToUserId(''); setToStartDate(''); setToEndDate(''); setToReason(''); setToType('vacation');
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

      {/* Weekly summary footer removed; summary now in header */}
    </div>
  );
}
