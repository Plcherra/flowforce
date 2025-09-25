import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
// Removed Command-based combobox in favor of inline suggestions
import { useSchedules } from '@/hooks/scheduling/useSchedules';
import { useAuth } from '@/hooks/useAuth';
import { usePositions } from '@/hooks/usePositions';
import { useProfile } from '@/hooks/useProfile';
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { useUnavailability } from '@/hooks/scheduling/useUnavailability';
import { format, addHours, differenceInMinutes, differenceInHours, parse } from 'date-fns';
import { CalendarIcon, Clock, Users, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UsersTab } from './add-shift/UsersTab';
import { TasksTab } from './add-shift/TasksTab';
import { NotesTab } from './add-shift/NotesTab';
import type { ShiftTask, BreakItem } from './add-shift/types';

// Types moved to add-shift/types

// Repeat pattern removed in favor of templates

interface AddShiftDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedDate: Date;
  children?: React.ReactNode;
}

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
];

// Repeat pattern and weekday constants removed

export function AddShiftDialog({ open, onOpenChange, selectedDate, children }: AddShiftDialogProps) {
  const { createSchedule, schedules } = useSchedules();
  const { user } = useAuth();
  const { positions } = usePositions();
  const { profile } = useProfile();
  const { employees, loading: employeesLoading, getEmployeesByPosition, getEmployeeFullName } = useEmployees();
  const { unavailability } = useUnavailability();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const [formData, setFormData] = useState({
    // Basic Details
    title: '',
    date: selectedDate,
    is_all_day: false,
    start_time: '09:30',
    end_time: '17:00',
    timezone: 'America/New_York',
    location: '',
    
    // Job & Users
    job_position_id: '',
    job_position_input: '',
    required_headcount: 1,
    assigned_users: [] as string[],
    can_claim: false,
    
    // Repeat removed
    breaks: [
      {
        id: '1',
        start_minutes: 240, // 4 hours in
        duration_minutes: 30,
        is_paid: false,
        title: 'Lunch Break'
      }
    ] as BreakItem[],
    
    // Notes & Tasks
    notes: '',
    attachments: [] as File[],
    tasks: [] as ShiftTask[],
  });

  // tasks are managed by TasksTab

  // Calculate total hours and net hours (minus unpaid breaks)
  const calculateHours = () => {
    if (formData.is_all_day) return { total: 24, net: 24 };
    
    const start = parse(formData.start_time, 'HH:mm', formData.date);
    const end = parse(formData.end_time, 'HH:mm', formData.date);
    const totalMinutes = differenceInMinutes(end, start);
    const unpaidBreakMinutes = (formData.breaks as BreakItem[])
      .filter(b => !b.is_paid)
      .reduce((sum, b) => sum + b.duration_minutes, 0);
    
    const totalHours = totalMinutes / 60;
    const netHours = (totalMinutes - unpaidBreakMinutes) / 60;
    
    return { total: totalHours, net: netHours };
  };

  const hours = calculateHours();

  // Position inline suggestions state
  const [showPositionSuggestions, setShowPositionSuggestions] = useState(false);
  const [positionActiveIndex, setPositionActiveIndex] = useState<number>(-1);
  // Location suggestions state
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationActiveIndex, setLocationActiveIndex] = useState<number>(-1);
  const distinctLocations = Array.from(new Set((schedules || []).map((s: any) => s.location).filter((l: any) => !!l))) as string[];
  // Users tab state handled within UsersTab

  // Availability helper
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
    const items = unavailability?.filter((ua: any) => ua.user_id === userId) || [];
    // Not available if any unavailability overlaps [start, end)
    return !items.some((ua: any) => {
      const uaStart = new Date(ua.start_time);
      const uaEnd = new Date(ua.end_time);
      return uaStart < end && uaEnd > start; // overlap
    });
  };

  // Shift templates support
  const [templateInput, setTemplateInput] = useState('');
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [templateActiveIndex, setTemplateActiveIndex] = useState(-1);
  const [shiftTemplates, setShiftTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const companyId = (user as any)?.user_metadata?.company_id || null;
        let query = supabase
          .from('shift_templates')
          .select('id, name, description, duration_hours, is_all_day, job_position_id, required_headcount, default_notes, color')
          .order('name');
        if (companyId) query = query.eq('company_id', companyId);
        const { data, error } = await query;
        if (error) throw error;
        setShiftTemplates(data || []);
      } catch (e) {
        console.error('Failed to fetch shift templates', e);
      }
    };
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTemplate = (tpl: any) => {
    const date = formData.date;
    // compute end time by adding duration_hours to current start time if not all day
    let newEnd = formData.end_time;
    if (!tpl.is_all_day && formData.start_time && tpl.duration_hours) {
      const start = parse(formData.start_time, 'HH:mm', date);
      const end = addHours(start, tpl.duration_hours);
      newEnd = format(end, 'HH:mm');
    }
    setFormData(prev => ({
      ...prev,
      title: tpl.name || prev.title,
      is_all_day: tpl.is_all_day ?? prev.is_all_day,
      end_time: newEnd,
      job_position_id: tpl.job_position_id || prev.job_position_id,
      required_headcount: tpl.required_headcount || prev.required_headcount,
      notes: tpl.default_notes || prev.notes,
    }));
  };

  const handleSaveTemplate = async () => {
    if (!user || !templateInput.trim()) return;
    setSavingTemplate(true);
    try {
      const { start_time, end_time } = formData;
      const start = parse(start_time, 'HH:mm', formData.date);
      const end = parse(end_time, 'HH:mm', formData.date);
      const duration = Math.max(0, differenceInMinutes(end, start)) / 60;
      const payload = {
        name: templateInput.trim(),
        description: null,
        duration_hours: duration || 0,
        is_all_day: formData.is_all_day,
        job_position_id: formData.job_position_id || null,
        required_headcount: formData.required_headcount || 1,
        default_notes: formData.notes || null,
        color: '#3b82f6',
        company_id: (user as any)?.user_metadata?.company_id || null,
        created_by: user.id,
      };
      const { data, error } = await supabase
        .from('shift_templates')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      setShiftTemplates(prev => [...prev, data]);
    } catch (e) {
      console.error('Failed to save template', e);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const startDateTime = formData.is_all_day 
        ? new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate(), 0, 0)
        : parse(formData.start_time, 'HH:mm', formData.date);
      
      const endDateTime = formData.is_all_day
        ? new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate(), 23, 59)
        : parse(formData.end_time, 'HH:mm', formData.date);

      await createSchedule({
        title: formData.title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: formData.location,
        is_all_day: formData.is_all_day,
        timezone: formData.timezone,
        required_headcount: formData.required_headcount,
        notes: formData.notes,
        break_minutes: 30,
        hourly_rate: 15.00,
        color: '#3b82f6',
        is_published: false,
        is_template: false,
        template_id: null,
        position_id: formData.job_position_id || null,
        role: 'Staff',
        status: 'scheduled',
        user_id: null,
        requirements: []
      });
      
      onOpenChange?.(false);
      resetForm();
    } catch (error) {
      console.error('Error creating shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: selectedDate,
      is_all_day: false,
      start_time: '09:30',
      end_time: '17:00',
      timezone: 'America/New_York',
      location: '',
      job_position_id: '',
      job_position_input: '',
      required_headcount: 1,
      assigned_users: [],
      can_claim: false,
      breaks: [{
        id: '1',
        start_minutes: 240,
        duration_minutes: 30,
        is_paid: false,
        title: 'Lunch Break'
      }],
      notes: '',
      attachments: [],
      tasks: [],
    });
    setActiveTab('details');
  };

  const onAddTask = (task: ShiftTask) => {
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const onRemoveTask = (taskId: string) => {
    setFormData(prev => ({ ...prev, tasks: prev.tasks.filter((t: ShiftTask) => t.id !== taskId) }));
  };

  const addBreak = () => {
    const newBreak: BreakItem = {
      id: Date.now().toString(),
      start_minutes: 240,
      duration_minutes: 30,
      is_paid: false,
      title: 'Break'
    };
    
    setFormData(prev => ({
      ...prev,
      breaks: [...prev.breaks, newBreak as any]
    }));
  };

  const removeBreak = (breakId: string) => {
    setFormData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((b: BreakItem) => b.id !== breakId)
    }));
  };

  const formatBreakTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="w-[95vw] sm:w-[700px] sm:h-[70vh] max-h-[85vh] p-4 sm:p-6 flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
          <DialogDescription>
            Set up a new shift with detailed scheduling options
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <TabsContent value="details" className="space-y-4">
              {/* Shift Title */}
              <div>
                <Label htmlFor="title">Shift Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Barista Closing"
                  required
                />
              </div>

              {/* Job Position (inline input with autocomplete) */}
              <div className="space-y-1">
                <Label htmlFor="job_position">Job Position</Label>
                <div className="relative">
                  <Input
                    id="job_position"
                    placeholder="Type a position name"
                    value={formData.job_position_input}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, job_position_input: val, job_position_id: '' });
                      setShowPositionSuggestions(!!val);
                      setPositionActiveIndex(-1);
                    }}
                    onFocus={() => setShowPositionSuggestions(!!formData.job_position_input)}
                    onBlur={() => setTimeout(() => setShowPositionSuggestions(false), 120)}
                    onKeyDown={(e) => {
                      const matches = positions.filter(p => p.name.toLowerCase().includes((formData.job_position_input || '').toLowerCase()));
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setPositionActiveIndex((prev) => Math.min(prev + 1, Math.max(matches.length - 1, 0)));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setPositionActiveIndex((prev) => Math.max(prev - 1, -1));
                      } else if (e.key === 'Enter' || e.key === 'Tab') {
                        if (matches.length > 0) {
                          const pick = matches[Math.max(positionActiveIndex, 0)];
                          setFormData({ ...formData, job_position_id: pick.id, job_position_input: pick.name });
                          setShowPositionSuggestions(false);
                        }
                      }
                    }}
                  />
                  {showPositionSuggestions && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                      <div className="max-h-56 overflow-y-auto py-1">
                        {positions
                          .filter(p => p.name.toLowerCase().includes((formData.job_position_input || '').toLowerCase()))
                          .slice(0, 8)
                          .map((p, idx) => (
                            <button
                              type="button"
                              key={p.id}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                idx === positionActiveIndex && 'bg-accent text-accent-foreground'
                              )}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormData({ ...formData, job_position_id: p.id, job_position_input: p.name });
                                setShowPositionSuggestions(false);
                              }}
                            >
                              {p.name}
                            </button>
                          ))}
                        {positions.filter(p => p.name.toLowerCase().includes((formData.job_position_input || '').toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No matches. Press Enter to keep as typed.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {formData.job_position_input && !formData.job_position_id && (
                  <p className="text-xs text-muted-foreground">Will save without linking to a saved position unless you choose a suggestion.</p>
                )}
              </div>

              {/* Date & Time */}
              <div className="space-y-3">
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => date && setFormData({ ...formData, date })}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={formData.is_all_day}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_all_day: checked })}
                  />
                  <Label htmlFor="all-day">All day</Label>
                </div>

                {!formData.is_all_day && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start_time">Start</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_time">End</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Duration Display */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{hours.total.toFixed(2)} Hours</span>
                      </div>
                      {formData.breaks.some(b => !b.is_paid) && (
                        <div className="flex items-center space-x-1">
                          <span>{formData.breaks.filter(b => !b.is_paid).length} Unpaid break</span>
                          <span>{formatBreakTime(formData.breaks.filter(b => !b.is_paid).reduce((sum, b) => sum + b.duration_minutes, 0))}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breaks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Breaks</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addBreak}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Break
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.breaks.map((breakItem) => (
                    <Card key={breakItem.id}>
                      <CardContent className="pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Break title"
                              value={breakItem.title}
                              onChange={(e) => {
                                const updated = formData.breaks.map(b => 
                                  b.id === breakItem.id ? { ...b, title: e.target.value } : b
                                );
                                setFormData({ ...formData, breaks: updated });
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Duration (min)"
                              value={breakItem.duration_minutes}
                              onChange={(e) => {
                                const updated = formData.breaks.map(b => 
                                  b.id === breakItem.id ? { ...b, duration_minutes: parseInt(e.target.value) || 0 } : b
                                );
                                setFormData({ ...formData, breaks: updated });
                              }}
                            />
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={breakItem.is_paid}
                                onCheckedChange={(checked) => {
                                  const updated = formData.breaks.map(b => 
                                    b.id === breakItem.id ? { ...b, is_paid: checked } : b
                                  );
                                  setFormData({ ...formData, breaks: updated });
                                }}
                              />
                              <Label className="text-xs">Paid</Label>
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBreak(breakItem.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Templates: load or save */}
              <div className="space-y-1">
                <Label htmlFor="shift_template">Template</Label>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="shift_template"
                      placeholder="Type to search or name a template"
                      value={templateInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTemplateInput(val);
                        setShowTemplateSuggestions(!!val);
                        setTemplateActiveIndex(-1);
                      }}
                      onFocus={() => setShowTemplateSuggestions(!!templateInput)}
                      onBlur={() => setTimeout(() => setShowTemplateSuggestions(false), 120)}
                      onKeyDown={(e) => {
                        const matches = shiftTemplates.filter((t) => t.name.toLowerCase().includes(templateInput.toLowerCase()));
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setTemplateActiveIndex((prev) => Math.min(prev + 1, Math.max(matches.length - 1, 0)));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setTemplateActiveIndex((prev) => Math.max(prev - 1, -1));
                        } else if (e.key === 'Enter' && matches.length > 0) {
                          const pick = matches[Math.max(templateActiveIndex, 0)];
                          setTemplateInput(pick.name);
                          applyTemplate(pick);
                          setShowTemplateSuggestions(false);
                        }
                      }}
                    />
                    {showTemplateSuggestions && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                        <div className="max-h-56 overflow-y-auto py-1">
                          {shiftTemplates
                            .filter((t) => t.name.toLowerCase().includes(templateInput.toLowerCase()))
                            .slice(0, 8)
                            .map((t, idx) => (
                              <button
                                type="button"
                                key={t.id}
                                className={cn(
                                  'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                  idx === templateActiveIndex && 'bg-accent text-accent-foreground'
                                )}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setTemplateInput(t.name);
                                  applyTemplate(t);
                                  setShowTemplateSuggestions(false);
                                }}
                              >
                                {t.name}
                              </button>
                            ))}
                          {shiftTemplates.filter((t) => t.name.toLowerCase().includes(templateInput.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No templates found. Type a name and click Save.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Save as template removed by request */}
                </div>
              </div>

              {/* Timezone removed by request */}

              {/* Location with suggestions */}
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, location: val });
                      setShowLocationSuggestions(!!val);
                      setLocationActiveIndex(-1);
                    }}
                    onFocus={() => setShowLocationSuggestions(!!formData.location)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 120)}
                    placeholder="Select or type a location (store)"
                  />
                  {showLocationSuggestions && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                      <div className="max-h-56 overflow-y-auto py-1">
                        {distinctLocations
                          .filter(loc => loc.toLowerCase().includes((formData.location || '').toLowerCase()))
                          .slice(0, 8)
                          .map((loc, idx) => (
                            <button
                              type="button"
                              key={loc}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                idx === locationActiveIndex && 'bg-accent text-accent-foreground'
                              )}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormData({ ...formData, location: loc });
                                setShowLocationSuggestions(false);
                              }}
                            >
                              {loc}
                            </button>
                          ))}
                        {distinctLocations.filter(loc => loc.toLowerCase().includes((formData.location || '').toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No saved locations. Type to add a new one.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UsersTab
                employees={employees}
                employeesLoading={employeesLoading}
                getEmployeesByPosition={getEmployeesByPosition}
                getEmployeeFullName={getEmployeeFullName}
                formData={formData}
                setFormData={setFormData}
                isUserAvailableForWindow={isUserAvailableForWindow}
              />

              {/* Shift Options */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="can-claim"
                  checked={formData.can_claim}
                  onCheckedChange={(checked) => setFormData({ ...formData, can_claim: checked })}
                />
                <Label htmlFor="can-claim">Enable users to claim this shift</Label>
              </div>

              {/* Position Info */}
              {formData.job_position_id && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm text-muted-foreground">
                          {getEmployeesByPosition(formData.job_position_id).length} users are qualified for {positions.find(p => p.id === formData.job_position_id)?.name}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {positions.find(p => p.id === formData.job_position_id)?.name}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <TasksTab tasks={formData.tasks as ShiftTask[]} onAddTask={onAddTask} onRemoveTask={onRemoveTask} />
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <NotesTab
                notes={formData.notes}
                onNotesChange={(val) => setFormData({ ...formData, notes: val })}
              />
            </TabsContent>
            </div>
          </Tabs>

          <Separator className="my-4" />

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Shift'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
