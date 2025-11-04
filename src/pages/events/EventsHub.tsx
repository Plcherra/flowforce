import { useMemo, useState } from 'react';
import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarDays, Plus, Search, Video, Wrench } from 'lucide-react';
import { SchedulingProvider } from '@/contexts/SchedulingContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { CreateVendorVisitDialog } from '@/components/events/CreateVendorVisitDialog';
import { CalendarView } from '@/components/events/CalendarView';
import { EventDetailsDrawer } from '@/components/events/EventDetailsDrawer';
import { useCalendarEvents, mapAppEventToCalendarEvent } from '@/hooks/useCalendarEvents';
import { useEvents } from '@/hooks/useEvents';

type ViewMode = 'month' | 'week' | 'day';

const computeRange = (view: ViewMode, base: Date) => {
  switch (view) {
    case 'month':
      return { start: startOfDay(startOfMonth(base)), end: endOfDay(endOfMonth(base)) };
    case 'week':
      return { start: startOfDay(startOfWeek(base)), end: endOfDay(endOfWeek(base)) };
    default:
      return { start: startOfDay(base), end: endOfDay(base) };
  }
};

export default function EventsHubPage() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogType, setSessionDialogType] = useState<'meeting' | 'event'>('meeting');
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  const range = useMemo(() => computeRange(view, currentDate), [view, currentDate]);
  const { events, loading, error, refresh } = useCalendarEvents({ range });
  const { events: cachedEvents, loading: cachedLoading } = useEvents();

  const fallbackEvents = useMemo(
    () => cachedEvents.map(mapAppEventToCalendarEvent),
    [cachedEvents],
  );

  const hasRemoteEvents = events.length > 0;
  const mergedEvents = hasRemoteEvents ? events : fallbackEvents;
  const mergedLoading = hasRemoteEvents ? loading : (loading && fallbackEvents.length === 0) || cachedLoading;
  const offlineNotice = !hasRemoteEvents && !!error;
  const displayError = hasRemoteEvents ? error : null;

  const selectedEvent = useMemo(
    () => mergedEvents.find((event) => event.id === selectedEventId) ?? null,
    [mergedEvents, selectedEventId],
  );

  const upcoming = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return mergedEvents
      .filter((event) => {
        const time = safeTime(event.start);
        if (!time || time < now) return false;
        return query ? (event.title || '').toLowerCase().includes(query) : true;
      })
      .sort((a, b) => (safeTime(a.start) ?? 0) - (safeTime(b.start) ?? 0))
      .slice(0, 6);
  }, [mergedEvents, search]);

  const handleEventCreated = (id: string) => {
    setSelectedEventId(id);
    setDetailsOpen(true);
    void refresh();
  };

  const handleVendorCreated = () => {
    void refresh();
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setDetailsOpen(true);
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedEventId(null);
    }
  };

  const handleShiftRangeNav = (delta: number) => {
    if (view === 'month') setCurrentDate((prev) => addMonthsSafe(prev, delta));
    else if (view === 'week') setCurrentDate((prev) => addDays(prev, delta * 7));
    else setCurrentDate((prev) => addDays(prev, delta));
  };

  return (
    <SchedulingProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Events & Meetings</h1>
                <p className="text-sm text-muted-foreground">Coordinate team sessions and vendor visits</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search upcoming events"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size={isMobile ? 'sm' : 'default'}
                  onClick={() => {
                    setSessionDialogType('meeting');
                    setSessionDialogOpen(true);
                  }}
                >
                  <Video className="mr-2 h-4 w-4" />
                  {isMobile ? 'Meeting' : 'New Meeting'}
                </Button>
                <Button
                  size={isMobile ? 'sm' : 'default'}
                  onClick={() => {
                    setSessionDialogType('event');
                    setSessionDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isMobile ? 'Event' : 'New Event'}
                </Button>
                <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => setVendorDialogOpen(true)}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Vendor Visit
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Calendar overview</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Button variant="ghost" size="sm" onClick={() => handleShiftRangeNav(-1)}>
                      Previous
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleShiftRangeNav(1)}>
                      Next
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CalendarView
                    events={mergedEvents}
                    date={currentDate}
                    view={view}
                    loading={Boolean(mergedLoading)}
                    error={displayError}
                    selectedEventId={selectedEventId}
                    onDateChange={setCurrentDate}
                    onViewChange={(next) => setView(next)}
                    onSelectEvent={(event) => handleSelectEvent(event.id)}
                  />
                  {offlineNotice && (
                    <div className="mt-3 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      Calendar offline. Showing cached events while we reconnect.
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <aside className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">Upcoming in range</h3>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {upcoming.length === 0 && (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No upcoming items.</div>
                  )}
                  {upcoming.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelectEvent(event.id)}
                      className="w-full rounded-md border bg-card p-3 text-left transition hover:border-primary"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{event.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">{formatPreview(event.start)}</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-[11px]">
                          {event.type ?? 'event'}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>

      <CreateEventDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        defaultType={sessionDialogType}
        onCreated={handleEventCreated}
      />
      <CreateVendorVisitDialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen} onCreated={handleVendorCreated} />
      <EventDetailsDrawer event={selectedEvent} open={detailsOpen} onOpenChange={handleDetailsOpenChange} onRefresh={refresh} />
    </SchedulingProvider>
  );
}

const addMonthsSafe = (date: Date, delta: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + delta);
  return next;
};

const safeTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const formatPreview = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
};
