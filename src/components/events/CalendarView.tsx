import { useMemo } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/hooks/useCalendarEvents';

type CalendarViewMode = 'month' | 'week' | 'day';
interface CalendarViewProps {
  events: CalendarEvent[];
  date: Date;
  view: CalendarViewMode;
  loading: boolean;
  error: string | null;
  selectedEventId?: string | null;
  onDateChange: (next: Date) => void;
  onViewChange: (next: CalendarViewMode) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}

const VIEW_LABELS: Record<CalendarViewMode, string> = { month: 'Month', week: 'Week', day: 'Day' };
const safeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

const sortByStart = (list: CalendarEvent[]) =>
  [...list].sort((a, b) => (safeDate(a.start)?.getTime() ?? 0) - (safeDate(b.start)?.getTime() ?? 0));
const renderSummary = (event: CalendarEvent) => {
  const start = safeDate(event.start);
  const end = safeDate(event.end ?? undefined);
  if (!start) return 'Time TBD';
  const startText = format(start, 'HH:mm');
  const endText = end ? format(end, 'HH:mm') : 'TBD';
  return `${startText} – ${endText}`;
};

const EventChip = ({ event, active, onSelect }: { event: CalendarEvent; active: boolean; onSelect?: (event: CalendarEvent) => void }) => (
  <button
    type="button"
    onClick={() => onSelect?.(event)}
    className={cn(
      'w-full rounded-md border px-2 py-1 text-left text-xs transition',
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:border-primary'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold text-foreground">{event.title || 'Untitled'}</span>
      {event.type && (
        <Badge variant="outline" className="text-[10px] capitalize">
          {event.type}
        </Badge>
      )}
    </div>
    <div className="mt-1 text-[11px] text-muted-foreground">{renderSummary(event)}</div>
  </button>
);

export function CalendarView({
  events,
  date,
  view,
  loading,
  error,
  selectedEventId,
  onDateChange,
  onViewChange,
  onSelectEvent,
}: CalendarViewProps) {
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const parsed = safeDate(event.start);
      if (!parsed) return;
      const key = dayKey(parsed);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    });
    return map;
  }, [events]);

  const monthDays = useMemo(() => {
    if (view !== 'month') return [] as Date[];
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    return eachDayOfInterval({ start, end });
  }, [date, view]);

  const weekDays = useMemo(() => {
    if (view !== 'week') return [] as Date[];
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    return eachDayOfInterval({ start, end });
  }, [date, view]);

  const currentDayEvents = useMemo(() => sortByStart(eventsByDay.get(dayKey(date)) ?? []), [date, eventsByDay]);

  const header = useMemo(() => {
    if (view === 'month') return format(date, 'MMMM yyyy');
    if (view === 'week') {
      const start = startOfWeek(date);
      const end = endOfWeek(date);
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
    }
    return format(date, 'EEEE, MMM d');
  }, [date, view]);

  const navigate = (direction: 'prev' | 'next') => {
    const delta = direction === 'prev' ? -1 : 1;
    if (view === 'month') onDateChange(addMonths(date, delta));
    else if (view === 'week') onDateChange(addDays(date, delta * 7));
    else onDateChange(addDays(date, delta));
  };

  const renderDayColumn = (day: Date, dense?: boolean) => {
    const key = dayKey(day);
    const list = sortByStart(eventsByDay.get(key) ?? []);
    return (
      <div key={key} className={cn('rounded-md border p-3', dense ? '' : 'min-h-[110px]')}
      >
        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
          <span className={cn(isSameDay(day, new Date()) && 'text-primary')}>{format(day, 'EEE')}</span>
          <span>{format(day, 'd')}</span>
        </div>
        <div className="space-y-2">
          {list.length === 0 && !loading && (
            <div className="text-[11px] text-muted-foreground">No events</div>
          )}
          {list.map((event) => (
            <EventChip key={event.id} event={event} active={selectedEventId === event.id} onSelect={onSelectEvent} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('next')}>
            Next
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">{header}</h2>
          <Tabs value={view} onValueChange={(value) => onViewChange(value as CalendarViewMode)}>
            <TabsList>
              {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
                <TabsTrigger key={mode} value={mode} className="text-xs uppercase">
                  {VIEW_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {view === 'month' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {monthDays.map((day) => (
            <div
              key={dayKey(day)}
              className={cn(
                'rounded-md border p-3',
                isSameMonth(day, date) ? 'bg-background' : 'bg-muted/40 text-muted-foreground'
              )}
            >
              {renderDayColumn(day, true)}
            </div>
          ))}
        </div>
      )}

      {view === 'week' && <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">{weekDays.map((day) => renderDayColumn(day))}</div>}

      {view === 'day' && (
        <div className="rounded-md border p-4 space-y-3">
          {currentDayEvents.length === 0 && !loading && (
            <div className="text-sm text-muted-foreground">No events scheduled for this day.</div>
          )}
          {currentDayEvents.map((event) => (
            <div
              key={event.id}
              className={cn(
                'rounded-md border p-3 transition',
                selectedEventId === event.id ? 'border-primary bg-primary/10' : 'border-border bg-background'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{event.title || 'Untitled'}</h3>
                  <p className="text-xs text-muted-foreground">{renderSummary(event)}</p>
                  {event.location && <p className="text-xs text-muted-foreground">Location: {event.location}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => onSelectEvent?.(event)}>
                  View
                </Button>
              </div>
              {event.participants.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {event.participants.slice(0, 3).map((person) => person.name).join(', ')}
                  {event.participants.length > 3 ? ` +${event.participants.length - 3}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Loading calendar…</div>
      )}

      {!loading && events.length === 0 && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No events in this window. Create one to get started.
        </div>
      )}
    </div>
  );
}
