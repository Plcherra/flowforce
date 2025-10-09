import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, Plus, X } from 'lucide-react';
import { format, addHours, differenceInMinutes, parse } from 'date-fns';
import type { Dispatch, SetStateAction } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Position } from '@/hooks/usePositions';
import type { ShiftWizardFormData, BreakItem } from './types';

type DetailsTabProps = {
  formData: ShiftWizardFormData;
  setFormData: Dispatch<SetStateAction<ShiftWizardFormData>>;
  positions: Position[];
  distinctLocations: string[];
  hours: { total: number; net: number };
};

type ShiftTemplate = {
  id: string;
  name: string;
  description?: string | null;
  duration_hours?: number | null;
  is_all_day?: boolean | null;
  job_position_id?: string | null;
  required_headcount?: number | null;
  default_notes?: string | null;
  color?: string | null;
};

export function DetailsTab({ formData, setFormData, positions, distinctLocations, hours }: DetailsTabProps) {
  const { user } = useAuth();
  const [showPositionSuggestions, setShowPositionSuggestions] = useState(false);
  const [positionActiveIndex, setPositionActiveIndex] = useState<number>(-1);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationActiveIndex, setLocationActiveIndex] = useState<number>(-1);

  const [templateInput, setTemplateInput] = useState('');
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [templateActiveIndex, setTemplateActiveIndex] = useState(-1);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return;

      try {
        const companyId = (user as any)?.user_metadata?.company_id || null;
        let query = supabase
          .from('shift_templates')
          .select('id, name, description, duration_hours, is_all_day, job_position_id, required_headcount, default_notes, color')
          .order('name');

        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query;
        if (error) throw error;
        setShiftTemplates((data ?? []) as ShiftTemplate[]);
      } catch (err) {
        console.error('Failed to load shift templates', err);
      }
    };

    fetchTemplates();
  }, [user]);

  const filteredPositions = useMemo(
    () =>
      positions.filter((position) =>
        position.name.toLowerCase().includes((formData.job_position_input || '').toLowerCase()),
      ),
    [formData.job_position_input, positions],
  );

  const filteredTemplates = useMemo(
    () => shiftTemplates.filter((tpl) => tpl.name?.toLowerCase().includes(templateInput.toLowerCase())),
    [shiftTemplates, templateInput],
  );

  const applyTemplate = (template: ShiftTemplate) => {
    const date = formData.date;
    let newEnd = formData.end_time;

    if (!template.is_all_day && formData.start_time && template.duration_hours) {
      const start = parse(formData.start_time, 'HH:mm', date);
      const end = addHours(start, template.duration_hours);
      newEnd = format(end, 'HH:mm');
    }

    setFormData((prev) => ({
      ...prev,
      title: template.name || prev.title,
      is_all_day: template.is_all_day ?? prev.is_all_day,
      end_time: newEnd,
      job_position_id: template.job_position_id || prev.job_position_id,
      job_position_input: template.job_position_id
        ? positions.find((p) => p.id === template.job_position_id)?.name ?? prev.job_position_input
        : prev.job_position_input,
      required_headcount: template.required_headcount || prev.required_headcount,
      notes: template.default_notes || prev.notes,
    }));
  };

  const addBreak = () => {
    const newBreak: BreakItem = {
      id: Date.now().toString(),
      start_minutes: 240,
      duration_minutes: 30,
      is_paid: false,
      title: 'Break',
    };

    setFormData((prev) => ({
      ...prev,
      breaks: [...prev.breaks, newBreak],
    }));
  };

  const removeBreak = (breakId: string) => {
    setFormData((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((item) => item.id !== breakId),
    }));
  };

  const formatBreakTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Shift Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="e.g., Barista Closing"
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="job_position">Job Position</Label>
        <div className="relative">
          <Input
            id="job_position"
            placeholder="Type a position name"
            value={formData.job_position_input}
            onChange={(event) => {
              const value = event.target.value;
              setFormData((prev) => ({ ...prev, job_position_input: value, job_position_id: '' }));
              setShowPositionSuggestions(Boolean(value));
              setPositionActiveIndex(-1);
            }}
            onFocus={() => setShowPositionSuggestions(Boolean(formData.job_position_input))}
            onBlur={() => setTimeout(() => setShowPositionSuggestions(false), 120)}
            onKeyDown={(event) => {
              if (filteredPositions.length === 0) return;

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setPositionActiveIndex((prev) => Math.min(prev + 1, filteredPositions.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setPositionActiveIndex((prev) => Math.max(prev - 1, 0));
              } else if (event.key === 'Enter' || event.key === 'Tab') {
                const pick = filteredPositions[Math.max(positionActiveIndex, 0)];
                if (pick) {
                  setFormData((prev) => ({
                    ...prev,
                    job_position_id: pick.id,
                    job_position_input: pick.name,
                  }));
                  setShowPositionSuggestions(false);
                }
              }
            }}
          />
          {showPositionSuggestions && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
              <div className="max-h-56 overflow-y-auto py-1">
                {filteredPositions.slice(0, 8).map((position, index) => (
                  <button
                    type="button"
                    key={position.id}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                      index === positionActiveIndex && 'bg-accent text-accent-foreground',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        job_position_id: position.id,
                        job_position_input: position.name,
                      }));
                      setShowPositionSuggestions(false);
                    }}
                  >
                    {position.name}
                  </button>
                ))}
                {filteredPositions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No matches. Press Enter to keep as typed.</div>
                )}
              </div>
            </div>
          )}
        </div>
        {formData.job_position_input && !formData.job_position_id && (
          <p className="text-xs text-muted-foreground">
            Will save without linking to a saved position unless you choose a suggestion.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !formData.date && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.date ? format(formData.date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.date}
                onSelect={(date) => date && setFormData((prev) => ({ ...prev, date }))}
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
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_all_day: checked }))}
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
                onChange={(event) => setFormData((prev) => ({ ...prev, start_time: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">End</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(event) => setFormData((prev) => ({ ...prev, end_time: event.target.value }))}
                required
              />
            </div>
          </div>
        )}

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{hours.total.toFixed(2)} Hours</span>
              </div>
              {formData.breaks.some((item) => !item.is_paid) && (
                <div className="flex items-center space-x-1">
                  <span>{formData.breaks.filter((item) => !item.is_paid).length} Unpaid break</span>
                  <span>
                    {formatBreakTime(
                      formData.breaks
                        .filter((item) => !item.is_paid)
                        .reduce((sum, item) => sum + item.duration_minutes, 0),
                    )}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Breaks</Label>
          <Button type="button" size="sm" variant="outline" onClick={addBreak}>
            <Plus className="mr-1 h-4 w-4" />
            Add Break
          </Button>
        </div>
        <div className="space-y-2">
          {formData.breaks.map((breakItem) => (
            <Card key={breakItem.id}>
              <CardContent className="pt-3">
                <div className="flex items-center justify-between">
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    <Input
                      placeholder="Break title"
                      value={breakItem.title}
                      onChange={(event) => {
                        const updated = formData.breaks.map((item) =>
                          item.id === breakItem.id ? { ...item, title: event.target.value } : item,
                        );
                        setFormData((prev) => ({ ...prev, breaks: updated }));
                      }}
                    />
                    <Input
                      type="number"
                      placeholder="Duration (min)"
                      value={breakItem.duration_minutes}
                      onChange={(event) => {
                        const updated = formData.breaks.map((item) =>
                          item.id === breakItem.id
                            ? { ...item, duration_minutes: Number.parseInt(event.target.value, 10) || 0 }
                            : item,
                        );
                        setFormData((prev) => ({ ...prev, breaks: updated }));
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={breakItem.is_paid}
                        onCheckedChange={(checked) => {
                          const updated = formData.breaks.map((item) =>
                            item.id === breakItem.id ? { ...item, is_paid: checked } : item,
                          );
                          setFormData((prev) => ({ ...prev, breaks: updated }));
                        }}
                      />
                      <Label className="text-xs">Paid</Label>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeBreak(breakItem.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="shift_template">Template</Label>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="shift_template"
              placeholder="Type to search or name a template"
              value={templateInput}
              onChange={(event) => {
                const value = event.target.value;
                setTemplateInput(value);
                setShowTemplateSuggestions(Boolean(value));
                setTemplateActiveIndex(-1);
              }}
              onFocus={() => setShowTemplateSuggestions(Boolean(templateInput))}
              onBlur={() => setTimeout(() => setShowTemplateSuggestions(false), 120)}
              onKeyDown={(event) => {
                if (filteredTemplates.length === 0) return;

                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setTemplateActiveIndex((prev) => Math.min(prev + 1, filteredTemplates.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setTemplateActiveIndex((prev) => Math.max(prev - 1, 0));
                } else if (event.key === 'Enter') {
                  const pick = filteredTemplates[Math.max(templateActiveIndex, 0)];
                  if (pick) {
                    setTemplateInput(pick.name ?? '');
                    applyTemplate(pick);
                    setShowTemplateSuggestions(false);
                  }
                }
              }}
            />
            {showTemplateSuggestions && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                <div className="max-h-56 overflow-y-auto py-1">
                  {filteredTemplates.slice(0, 8).map((template, index) => (
                    <button
                      type="button"
                      key={template.id}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                        index === templateActiveIndex && 'bg-accent text-accent-foreground',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setTemplateInput(template.name ?? '');
                        applyTemplate(template);
                        setShowTemplateSuggestions(false);
                      }}
                    >
                      {template.name}
                    </button>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No templates found. Type a name and press Enter to load.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="location">Location</Label>
        <div className="relative">
          <Input
            id="location"
            value={formData.location}
            onChange={(event) => {
              const value = event.target.value;
              setFormData((prev) => ({ ...prev, location: value }));
              setShowLocationSuggestions(Boolean(value));
              setLocationActiveIndex(-1);
            }}
            onFocus={() => setShowLocationSuggestions(Boolean(formData.location))}
            onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 120)}
            placeholder="Select or type a location (store)"
          />
          {showLocationSuggestions && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
              <div className="max-h-56 overflow-y-auto py-1">
                {distinctLocations
                  .filter((location) => location.toLowerCase().includes((formData.location || '').toLowerCase()))
                  .slice(0, 8)
                  .map((location, index) => (
                    <button
                      type="button"
                      key={location}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                        index === locationActiveIndex && 'bg-accent text-accent-foreground',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, location }));
                        setShowLocationSuggestions(false);
                      }}
                    >
                      {location}
                    </button>
                  ))}
                {distinctLocations.filter((location) =>
                  location.toLowerCase().includes((formData.location || '').toLowerCase()),
                ).length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No saved locations. Type to add a new one.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
