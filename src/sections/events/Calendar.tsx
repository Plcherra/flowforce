import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Search } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SchedulingCalendar } from "@/components/scheduling/SchedulingCalendar";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { useEvents } from "@/hooks/useEvents";

function demoEvent() {
  const start = new Date();
  const end = new Date(start.getTime() + 1000 * 60 * 60);
  return {
    title: "Demo Company Event",
    description: "A demo event created locally.",
    start: start.toISOString(),
    end: end.toISOString(),
    type: "event" as const,
  };
}

function EventsList() {
  const { events, createEvent } = useEvents();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {events.length} events
        </div>
        <button
          className="text-primary text-sm underline"
          onClick={async () => {
            await createEvent(demoEvent());
          }}
        >
          Create demo event
        </button>
      </div>

      {events.length === 0 && (
        <div className="text-sm text-muted-foreground">No upcoming events.</div>
      )}

      {events.slice(0, 5).map((e) => (
        <div key={e.id} className="border border-border rounded-md p-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{e.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(e.start).toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{e.type}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EventsCalendarPage() {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-card border border-border rounded-md mb-6 sticky top-4 z-20">
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Events</h1>
                <p className="text-sm text-muted-foreground">
                  Company events, meetings and shared calendar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events..."
                  className="pl-10 w-56"
                />
              </div>
              <Button size={isMobile ? "sm" : "default"}>
                <Plus className="h-4 w-4 mr-2" />
                {isMobile ? "" : "New Event"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <h3 className="text-sm font-medium">Event Calendar</h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <SchedulingProvider>
                  <SchedulingCalendar mode="events" />
                </SchedulingProvider>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="px-4 py-3">
                <h3 className="text-sm font-medium">Upcoming Events</h3>
              </CardHeader>
              <CardContent className="p-4">
                <EventsList />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3">
                <h3 className="text-sm font-medium">Quick Actions</h3>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  Create recurring event
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Import from Google Calendar
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Export calendar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
