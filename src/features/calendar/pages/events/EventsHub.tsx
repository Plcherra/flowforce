import { useMemo, useState } from "react";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { CalendarDays, Plus, Search, Wrench } from "lucide-react";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CreateEventDialog } from "@/features/calendar/components/CreateEventDialog";
import { CreateVendorVisitDialog } from "@/features/calendar/components/CreateVendorVisitDialog";
import { EventDetailsDrawer } from "@/features/calendar/components/EventDetailsDrawer";
import { SchedulingCalendar } from "@/features/scheduling/components/SchedulingCalendar";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  useCalendarEvents,
  mapAppEventToCalendarEvent,
} from "@/hooks/useCalendarEvents";
import { useEvents } from "@/hooks/useEvents";
import {
  getSupabaseSetupMessage,
  isMissingTableError,
} from "@/shared/utils/supabaseErrors";

export default function EventsHubPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  const listRange = useMemo(
    () => ({
      start: startOfDay(subDays(new Date(), 30)),
      end: endOfDay(addDays(new Date(), 90)),
    }),
    [],
  );

  const { events: cachedEvents, loading: cachedLoading, error: eventsError } =
    useEvents();
  const { events: rangeEvents, loading: rangeLoading, error: rangeError, refresh } =
    useCalendarEvents({ range: listRange });

  const loadError = rangeError ?? eventsError;
  const calendarSetupMissing = isMissingTableError(loadError, [
    "calendar_events_full",
    "calendar_events",
  ]);

  const mergedEvents = useMemo(() => {
    if (calendarSetupMissing) return [];
    const source =
      rangeEvents.length > 0
        ? rangeEvents
        : cachedEvents.map(mapAppEventToCalendarEvent);
    const unique = new Map(source.map((event) => [event.id, event]));
    return Array.from(unique.values());
  }, [calendarSetupMissing, cachedEvents, rangeEvents]);

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
        return query ? (event.title || "").toLowerCase().includes(query) : true;
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

  const handleOverlayEventSelect = (eventId: string | null) => {
    setSelectedEventId(eventId);
    setDetailsOpen(Boolean(eventId));
  };

  const isLoading = cachedLoading || rangeLoading;

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
                <h1 className="text-xl font-bold">Calendar</h1>
                <p className="text-sm text-muted-foreground">
                  Schedule meetings, events, and vendor visits in one place
                </p>
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
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setSessionDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isMobile ? "Add" : "Add to calendar"}
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setVendorDialogOpen(true)}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  Vendor Visit
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="space-y-4 lg:col-span-2">
              {calendarSetupMissing ? (
                <FeatureSetupRequiredState
                  title="Calendar module is not fully set up yet"
                  description={getSupabaseSetupMessage(loadError, "Calendar")}
                  icon={<CalendarDays className="h-5 w-5" />}
                  setupDescription={
                    <>
                      Missing table: <code>calendar_events_full</code>. Restore
                      the calendar migrations, then refresh this page.
                    </>
                  }
                />
              ) : loadError ? (
                <FeatureErrorState
                  title="Unable to load calendar"
                  description={loadError}
                />
              ) : (
                <SchedulingCalendar
                  mode="events"
                  externalDetails
                  onOverlayEventSelect={handleOverlayEventSelect}
                />
              )}
            </section>

            <aside className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">Upcoming</h3>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {isLoading && (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      Loading events…
                    </div>
                  )}
                  {!isLoading && upcoming.length === 0 && (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      No upcoming items. Use Add to calendar to schedule one.
                    </div>
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
                          <p className="text-sm font-semibold text-foreground">
                            {event.title || "Untitled"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPreview(event.start)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[11px] capitalize"
                        >
                          {event.type ?? "event"}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {event.description}
                        </p>
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
        onCreated={handleEventCreated}
      />
      <CreateVendorVisitDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        onCreated={handleVendorCreated}
      />
      <EventDetailsDrawer
        event={selectedEvent}
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        onRefresh={refresh}
      />
    </SchedulingProvider>
  );
}

const safeTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const formatPreview = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
};
