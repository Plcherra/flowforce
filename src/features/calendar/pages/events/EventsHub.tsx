import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Search, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreateEventDialog } from "@/features/calendar/components/CreateEventDialog";
import { CreateVendorVisitDialog } from "@/features/calendar/components/CreateVendorVisitDialog";
import { EditEventDialog } from "@/features/calendar/components/EditEventDialog";
import { EventDetailsDrawer } from "@/features/calendar/components/EventDetailsDrawer";
import { EventsCalendarBoard } from "@/features/calendar/components/EventsCalendarBoard";
import {
  calendarQuery,
  eventMatchesQuery,
  parseCalendarDate,
  type CalendarBoardView,
} from "@/features/calendar/utils/calendarBoard";
import { useEvents, type AppEvent } from "@/hooks/useEvents";
import {
  mapAppEventToCalendarEvent,
  type CalendarEvent,
} from "@/hooks/useCalendarEvents";
import { useSearchParams } from "@/lib/router-adapter";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  getSupabaseSetupMessage,
  isMissingTableError,
} from "@/shared/utils/supabaseErrors";

const VIEWS = new Set<CalendarBoardView>(["day", "week", "month"]);

function initialView(requested: string | null): CalendarBoardView {
  if (requested && VIEWS.has(requested as CalendarBoardView)) {
    return requested as CalendarBoardView;
  }
  return "week";
}

function eventTypeLabel(
  type: string | null | undefined,
  t: (key: string) => string,
) {
  if (type === "meeting") return t("sections.meeting");
  if (type === "vendor_visit") return t("calendar.vendorVisit");
  return t("dashboard.event");
}

export default function EventsHubPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(
    () => parseCalendarDate(searchParams.get("date")) ?? new Date(),
  );
  const [view, setView] = useState<CalendarBoardView>(() =>
    initialView(searchParams.get("view")),
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    searchParams.get("event"),
  );
  const [pinned, setPinned] = useState<CalendarEvent | null>(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);

  const { events, loading, error } = useEvents();
  const calendarSetupMissing = isMissingTableError(error, [
    "calendar_events_full",
    "calendar_events",
  ]);

  const calendarEvents = useMemo(() => {
    const mapped = new Map(
      events.map((event) => [event.id, mapAppEventToCalendarEvent(event)]),
    );
    if (pinned) mapped.set(pinned.id, pinned);
    return Array.from(mapped.values());
  }, [events, pinned]);

  const filtered = useMemo(
    () => calendarEvents.filter((event) => eventMatchesQuery(event, search)),
    [calendarEvents, search],
  );

  const listed = useMemo(() => {
    const now = Date.now();
    const source = search.trim()
      ? filtered
      : filtered.filter((event) => {
          const time = Date.parse(event.start);
          return !Number.isNaN(time) && time >= now;
        });
    return [...source]
      .sort((left, right) => Date.parse(left.start) - Date.parse(right.start))
      .slice(0, 8);
  }, [filtered, search]);

  const selectedEvent = useMemo(() => {
    if (pinned && pinned.id === selectedEventId) return pinned;
    return calendarEvents.find((event) => event.id === selectedEventId) ?? null;
  }, [calendarEvents, pinned, selectedEventId]);

  const remember = (nextDate: Date, eventId?: string | null) => {
    setDate(nextDate);
    setSearchParams(calendarQuery(searchParams, nextDate, eventId));
  };

  useEffect(() => {
    const parsed = parseCalendarDate(searchParams.get("date"));
    if (!parsed) return;
    setDate((current) =>
      current.getFullYear() === parsed.getFullYear() &&
      current.getMonth() === parsed.getMonth() &&
      current.getDate() === parsed.getDate()
        ? current
        : parsed,
    );
  }, [searchParams]);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId || loading) return;
    const match = calendarEvents.find((event) => event.id === eventId);
    if (!match) return;
    setSelectedEventId(eventId);
    setDetailsOpen(true);
    if (!searchParams.get("date")) {
      const start = new Date(match.start);
      if (!Number.isNaN(start.getTime())) setDate(start);
    }
  }, [calendarEvents, loading, searchParams]);

  const openEvent = (eventId: string, nextDate?: Date) => {
    const match = calendarEvents.find((event) => event.id === eventId);
    const start = nextDate ?? (match ? new Date(match.start) : date);
    const resolved = Number.isNaN(start.getTime()) ? date : start;
    setSelectedEventId(eventId);
    setDetailsOpen(true);
    remember(resolved, eventId);
  };

  const handleCreated = (event: AppEvent) => {
    const mapped = mapAppEventToCalendarEvent(event);
    setPinned(mapped);
    setSelectedEventId(mapped.id);
    setDetailsOpen(true);
    const start = new Date(mapped.start);
    if (!Number.isNaN(start.getTime())) remember(start, mapped.id);
  };

  const handleSaved = (event: AppEvent) => {
    setPinned(mapAppEventToCalendarEvent(event));
  };

  useEffect(() => {
    if (!pinned) return;
    const match = events.find((event) => event.id === pinned.id);
    if (!match) return;
    if (
      match.title === pinned.title &&
      match.start === pinned.start &&
      (match.end ?? null) === (pinned.end ?? null)
    ) {
      setPinned(null);
    }
  }, [events, pinned]);

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedEventId(null);
      setSearchParams(calendarQuery(searchParams, date, null));
    }
  };

  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <SchedulingProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("common.calendar")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("calendar.scheduleMeetingsEventsAndVendorVisitsInOne")}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder={t("calendar.searchUpcomingEvents")}
                  aria-label={t("calendar.searchEvents")}
                  value={search}
                  onChange={(change) => setSearch(change.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="calendar-add"
                  onClick={() => setSessionDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("calendar.addToCalendar")}
                </Button>
                <Button
                  variant="outline"
                  data-testid="calendar-vendor"
                  onClick={() => setVendorDialogOpen(true)}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  {t("schedule.vendorVisit")}
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
                  title={t("calendar.calendarModuleIsNotFullySetUpYet")}
                  description={getSupabaseSetupMessage(error, "Calendar")}
                  icon={<CalendarDays className="h-5 w-5" />}
                  setupDescription={
                    <>
                      {t("calendar.missingTable")}
                      <code>{t("schedule.calendarEventsFull")}</code>
                      {t("calendar.restoreTheCalendarMigrationsThenRefreshThisPage")}
                    </>
                  }
                />
              ) : error && calendarEvents.length === 0 ? (
                <FeatureErrorState
                  title={t("calendar.unableToLoadCalendar")}
                  description={error}
                />
              ) : (
                <>
                  {error ? (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <EventsCalendarBoard
                    events={filtered}
                    loading={loading && calendarEvents.length === 0}
                    date={date}
                    view={view}
                    selectedEventId={selectedEventId}
                    onDateChange={(next) => remember(next, selectedEventId)}
                    onViewChange={setView}
                    onSelectEvent={(eventId) => openEvent(eventId)}
                  />
                </>
              )}
            </section>

            <aside className="space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <h3 className="text-sm font-medium">
                    {search.trim() ? t("calendar.searchEvents") : t("tasks.upcoming")}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-2 p-3">
                  {loading && calendarEvents.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      {t("calendar.loadingEvents")}
                    </div>
                  ) : null}
                  {!loading && listed.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                      {t("calendar.noUpcomingItemsUseAddToCalendarTo")}
                    </div>
                  ) : null}
                  {listed.map((event) => {
                    const start = new Date(event.start);
                    const when = Number.isNaN(start.getTime())
                      ? t("calendar.unknownTime")
                      : timeFormatter.format(start);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => openEvent(event.id, start)}
                        className="w-full rounded-md border bg-card p-3 text-left transition hover:border-primary"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {event.title || t("calendar.untitledEvent")}
                            </p>
                            <p className="text-xs text-muted-foreground">{when}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[11px]">
                            {eventTypeLabel(event.type, t)}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>

      <CreateEventDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        onCreated={handleCreated}
      />
      <CreateVendorVisitDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        onCreated={handleCreated}
      />
      <EditEventDialog
        event={selectedEvent}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
      <EventDetailsDrawer
        event={selectedEvent}
        open={detailsOpen}
        onOpenChange={handleDetailsOpenChange}
        onEdit={() => setEditOpen(true)}
      />
    </SchedulingProvider>
  );
}
