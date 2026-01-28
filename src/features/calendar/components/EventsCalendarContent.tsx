import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert } from "@/components/ui/alert";
import {
  CalendarDays,
  CloudDownload,
  CloudUpload,
  Plus,
  Search,
  Video,
  Wrench,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEvents } from "@/hooks/useEvents";
import { useScheduling } from "@/contexts/SchedulingContext";
import { Skeleton } from "@/components/ui/skeleton";
import { SchedulingCalendar } from "@/components/scheduling/SchedulingCalendar";
import { CreateEventDialog } from "@/features/calendar/components/CreateEventDialog";
import { CreateVendorVisitDialog } from "@/features/calendar/components/CreateVendorVisitDialog";
import { NetworkStatusBanner } from "@/features/calendar/components/NetworkStatusBanner";

const formatRange = (startIso: string, endIso?: string) => {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    return "Unknown time";
  }

  const base = start.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  if (!endIso) return base;

  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return base;

  return `${base} – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export function EventsCalendarContent() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionDialogType, setSessionDialogType] = useState<
    "meeting" | "event"
  >("event");
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const { events, loading, error, errorCode } = useEvents();
  const { loading: schedulingLoading, error: schedulingError } =
    useScheduling();

  const upcoming = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return events
      .filter((event) => {
        const start = Date.parse(event.start);
        if (Number.isNaN(start) || start < now) return false;
        if (!query) return true;
        const haystack = `${event.title} ${event.location ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 6);
  }, [events, search]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
    },
    [],
  );

  const handleOpenSessionDialog = useCallback((type: "meeting" | "event") => {
    setSessionDialogType(type);
    setSessionDialogOpen(true);
  }, []);

  const handleToggleSessionDialog = useCallback((open: boolean) => {
    setSessionDialogOpen(open);
  }, []);

  const handleOpenVendorDialog = useCallback(
    () => setVendorDialogOpen(true),
    [],
  );
  const handleToggleVendorDialog = useCallback(
    (open: boolean) => setVendorDialogOpen(open),
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Events &amp; Meetings</h1>
                <p className="text-sm text-muted-foreground">
                  Track company sessions, meetings, and vendor visits in one
                  calendar.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={handleSearchChange}
                  aria-label="Search events"
                  className="w-64 pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size={isMobile ? "sm" : "default"}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isMobile ? "" : "Schedule"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => handleOpenSessionDialog("meeting")}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenSessionDialog("event")}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenVendorDialog}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Vendor visit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        <NetworkStatusBanner
          errorMessage={error}
          errorCode={errorCode}
          data-testid="events-network-banner"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4" />
                  <h3 className="text-sm font-medium">Event Calendar</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <NetworkStatusBanner
                  errorMessage={schedulingError}
                  errorCode={undefined}
                  data-testid="scheduling-network-banner"
                />

                {schedulingError ? (
                  <Skeleton
                    className="h-[540px] w-full rounded-md"
                    data-testid="calendar-skeleton"
                  />
                ) : schedulingLoading ? (
                  <Skeleton
                    className="h-[540px] w-full rounded-md"
                    data-testid="calendar-skeleton"
                  />
                ) : (
                  <SchedulingCalendar mode="events" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-medium">
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {loading ? (
                  <div className="space-y-3" data-testid="upcoming-skeleton">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-border p-3"
                      >
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming events match your filters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcoming.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {event.title || "Untitled session"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatRange(event.start, event.end)}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {event.type ?? "event"}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 sm:px-6">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 sm:p-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => handleOpenSessionDialog("event")}
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Create event
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  disabled
                  title="Google Calendar import is coming soon."
                >
                  <CloudUpload className="h-4 w-4 text-muted-foreground" />
                  Import from Google Calendar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  disabled
                  title="Exporting calendars will be available soon."
                >
                  <CloudDownload className="h-4 w-4 text-muted-foreground" />
                  Export calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CreateEventDialog
        open={sessionDialogOpen}
        onOpenChange={handleToggleSessionDialog}
        defaultType={sessionDialogType}
      />
      <CreateVendorVisitDialog
        open={vendorDialogOpen}
        onOpenChange={handleToggleVendorDialog}
      />
    </div>
  );
}
