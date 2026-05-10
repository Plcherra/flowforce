import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/lib/router-adapter";
import config from "./section.config";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useEvents, AppEvent } from "@/hooks/useEvents";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input as UiInput } from "@/components/ui/input";
import { logger } from "@/utils/logger";
import { isSameDay } from "@/shared/utils";

// Calendar utilities
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, days: number) {
  const nx = new Date(d);
  nx.setDate(nx.getDate() + days);
  return nx;
}

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseISO(d?: string) {
  if (!d) return null;
  return new Date(d);
}

function CalendarView({
  query,
  setQuery,
}: {
  query: string;
  setQuery: (v: string) => void;
}) {
  const { events } = useEvents();
  const [current, setCurrent] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<"day" | "week" | "month">("month");

  // filter events by search
  const filtered = useMemo(() => {
    if (!query) return events;
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q),
    );
  }, [events, query]);

  // build month matrix (weeks x days)
  const weeks = useMemo(() => {
    const start = startOfMonth(current);
    const end = endOfMonth(current);
    const startWeekDay = start.getDay(); // 0..6 (Sun..Sat)

    const cells: Date[] = [];
    // go back to Sunday of the first week
    const gridStart = addDays(start, -startWeekDay);
    const totalCells = 42; // 6 weeks view
    for (let i = 0; i < totalCells; i++) {
      cells.push(addDays(gridStart, i));
    }

    const rows: Date[][] = [];
    for (let r = 0; r < 6; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [current]);

  // map events per day
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    filtered.forEach((ev) => {
      const s = parseISO(ev.start);
      if (!s) return;
      const key = formatDateKey(s);
      const arr = map.get(key) || [];
      arr.push(ev);
      map.set(key, arr);
    });
    return map;
  }, [filtered]);

  // responsive check: simple CSS breakpoint via effect only to set a mobile flag
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // navigation depending on view
  function prevMonth() {
    if (view === "month")
      setCurrent((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    else if (view === "week") setCurrent((c) => addDays(c, -7));
    else setCurrent((c) => addDays(c, -1));
  }
  function nextMonth() {
    if (view === "month")
      setCurrent((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    else if (view === "week") setCurrent((c) => addDays(c, 7));
    else setCurrent((c) => addDays(c, 1));
  }

  // render helpers
  function renderDayView(day: Date) {
    const key = formatDateKey(day);
    const list = (eventsByDay.get(key) || [])
      .slice()
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    const startHour = 6;
    const endHour = 22;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return (
      <div className="mt-2">
        <div className="mb-2 font-medium">{day.toDateString()}</div>
        <div className="grid grid-cols-[100px_1fr] gap-px bg-border rounded overflow-hidden">
          {/* Time labels column */}
          <div className="bg-muted/10 p-2" />
          <div className="bg-muted/10 p-2">Day Agenda</div>

          {hours.map((h) => (
            <>
              <div
                key={`label-${h}`}
                className="bg-white p-2 text-xs text-muted-foreground"
              >
                {String(h).padStart(2, "0")}:00
              </div>
              <div key={`slot-${h}`} className="bg-white p-2 min-h-[48px]">
                {list
                  .filter((ev) => {
                    const s = parseISO(ev.start);
                    if (!s) return false;
                    return s.getHours() === h;
                  })
                  .map((ev) => {
                    const s = parseISO(ev.start)!;
                    const e =
                      parseISO(ev.end) ||
                      new Date(s.getTime() + 60 * 60 * 1000);
                    const durationH = Math.max(
                      1,
                      Math.round(
                        (e.getTime() - s.getTime()) / (60 * 60 * 1000),
                      ),
                    );
                    return (
                      <div
                        key={ev.id}
                        className="mb-2 p-2 border rounded bg-primary/10"
                      >
                        <div className="font-semibold text-sm">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          —{" "}
                          {e.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {ev.location}
                        </div>
                        {ev.description && (
                          <div className="text-xs mt-1 text-gray-700 truncate">
                            {ev.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ))}
        </div>
      </div>
    );
  }

  function renderWeekView(center: Date) {
    const start = addDays(center, -center.getDay());
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    const startHour = 6;
    const endHour = 22;
    const hours = Array.from(
      { length: endHour - startHour },
      (_, i) => startHour + i,
    );

    return (
      <div className="overflow-auto">
        <div className="grid grid-cols-[100px_repeat(7,1fr)]">
          <div className="bg-muted/10 p-2" />
          {days.map((d) => (
            <div
              key={`hd-${formatDateKey(d)}`}
              className="p-2 text-center text-sm font-medium bg-muted/10"
            >
              {d.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          ))}

          {hours.map((h) => (
            <>
              <div
                key={`label-${h}`}
                className="p-2 text-xs text-muted-foreground border-t"
              >
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => (
                <div
                  key={`${formatDateKey(d)}-${h}`}
                  className="p-2 border-t min-h-[60px]"
                >
                  {(eventsByDay.get(formatDateKey(d)) || [])
                    .filter((ev) => {
                      const s = parseISO(ev.start);
                      if (!s) return false;
                      return s.getHours() === h;
                    })
                    .map((ev) => {
                      const s = parseISO(ev.start)!;
                      const e =
                        parseISO(ev.end) ||
                        new Date(s.getTime() + 60 * 60 * 1000);
                      return (
                        <div
                          key={ev.id}
                          className="mb-1 p-1 rounded bg-primary/10 text-sm border"
                        >
                          <div className="font-semibold truncate">
                            {ev.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            • {ev.location}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </>
          ))}
        </div>
      </div>
    );
  }

  // mobile agenda list
  if (isMobile) {
    const list = filtered
      .slice()
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">
            {current.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="px-2 py-1 rounded border">
              Prev
            </button>
            <button onClick={nextMonth} className="px-2 py-1 rounded border">
              Next
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {list.map((ev) => (
            <div
              key={ev.id}
              className="p-3 border rounded-md shadow-sm bg-white"
            >
              <div className="font-semibold">{ev.title}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(ev.start).toLocaleString()} — {ev.location}
              </div>
              <div className="text-sm mt-2 truncate text-gray-700">
                {ev.description}
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-sm text-gray-600">No events</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">
            {current.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("day")}
              className={`px-2 py-1 rounded ${view === "day" ? "bg-primary text-white" : "border"}`}
            >
              Day
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-2 py-1 rounded ${view === "week" ? "bg-primary text-white" : "border"}`}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-2 py-1 rounded ${view === "month" ? "bg-primary text-white" : "border"}`}
            >
              Month
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 rounded border">
            Prev
          </button>
          <button onClick={nextMonth} className="px-3 py-1 rounded border">
            Next
          </button>
        </div>
      </div>

      {view === "month" ? (
        <div className="grid grid-cols-7 gap-px bg-border rounded-t-md overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="bg-muted/10 text-center text-xs py-2 text-gray-600"
            >
              {d}
            </div>
          ))}

          {weeks.map((week, i) => (
            <div key={i} className="contents">
              {week.map((day) => {
                const inMonth = day.getMonth() === current.getMonth();
                const key = formatDateKey(day);
                const dayEvents = eventsByDay.get(key) || [];
                return (
                  <div
                    key={key}
                    className={`min-h-[110px] p-2 bg-white ${inMonth ? "bg-white" : "bg-gray-50 text-gray-400"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-medium">{day.getDate()}</div>
                    </div>

                    <div className="mt-2 space-y-2">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div key={ev.id} className="relative">
                          <div
                            className="group bg-primary/10 border border-primary/20 rounded px-2 py-1 text-xs cursor-pointer hover:shadow-lg transition-shadow"
                            aria-label={`${ev.title} ${ev.location || ""}`}
                          >
                            <div className="font-semibold truncate">
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(ev.start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              • {ev.location}
                            </div>
                          </div>

                          <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 z-50">
                            <div className="bg-white border rounded shadow-lg p-3 text-sm">
                              <div className="font-semibold mb-1">
                                {ev.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(ev.start).toLocaleString()} —{" "}
                                {ev.location}
                              </div>
                              {ev.description && (
                                <div className="mt-2 text-xs text-gray-700 truncate">
                                  {ev.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : view === "week" ? (
        renderWeekView(current)
      ) : (
        renderDayView(current)
      )}
    </div>
  );
}

export default function EventsIndex() {
  const [query, setQuery] = useState("");
  const { createEvent } = useEvents();

  async function handleQuickAdd() {
    const title = window.prompt("Event title");
    if (!title) return;
    const start = window.prompt(
      "Start (YYYY-MM-DDTHH:mm)",
      new Date().toISOString().slice(0, 16),
    );
    if (!start) return;
    const location = window.prompt("Location (optional)") || "";
    try {
      await createEvent({
        title,
        start: new Date(start).toISOString(),
        location,
        description: "",
      });
      // quick feedback
      window.alert("Event created");
    } catch (err) {
      logger.error("Failed to create event", { error: err, tags: ["error"] });
      window.alert("Failed to create event");
    }
  }
  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-4">{config.title}</h1>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-medium">Meetings</h2>
                  {/* removed unnecessary Events button */}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">&nbsp;</div>
                  <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search events..."
                      className="pl-10"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">New meeting</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create meeting</DialogTitle>
                      </DialogHeader>
                      <EventForm onClose={() => {}} defaultType="meeting" />
                    </DialogContent>
                  </Dialog>

                  <div>
                    <ImportEventsButton />
                  </div>
                </div>
              </div>

              <CalendarView query={query} setQuery={setQuery} />

              {/* Floating Add button */}
              <button
                className="fixed right-6 bottom-6 bg-primary text-white rounded-full h-14 w-14 flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                aria-label="Add Event"
                onClick={() => {
                  handleQuickAdd();
                }}
              >
                <span className="text-2xl">➕</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EventForm({
  onClose,
  defaultType = "event",
}: {
  onClose: () => void;
  defaultType?: "event" | "meeting";
}) {
  const { createEvent } = useEvents();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 16));
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"event" | "meeting">(
    defaultType as "event" | "meeting",
  );

  async function submit() {
    if (!title || !start) return window.alert("Title and start are required");
    await createEvent({
      title,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : undefined,
      location,
      description,
      type,
    });
    onClose();
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Title</Label>
        <UiInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Start</Label>
        <UiInput
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div>
        <Label>End</Label>
        <UiInput
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <div>
        <Label>Location</Label>
        <UiInput
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label>Type</Label>
        <div className="flex items-center gap-2 mb-3">
          <button
            className={`px-2 py-1 rounded ${type === "event" ? "bg-primary text-white" : "border"}`}
            onClick={() => setType("event")}
          >
            Event
          </button>
          <button
            className={`px-2 py-1 rounded ${type === "meeting" ? "bg-primary text-white" : "border"}`}
            onClick={() => setType("meeting")}
          >
            Meeting
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={submit}>Create</Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ImportEventsButton() {
  const { createEvent } = useEvents();

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const text = await files[0].text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      // CSV: title,start,end,location,description,type
      const parts = line.split(",");
      const [title, start, end, location, description, type] = parts.map((p) =>
        p?.trim(),
      );
      if (!title || !start) continue;
      await createEvent({
        title,
        start: new Date(start).toISOString(),
        end: end ? new Date(end).toISOString() : undefined,
        location,
        description,
        type: (type === "meeting" ? "meeting" : "event") as any,
      });
    }
    window.alert("Import complete");
    // clear input
    (e.target as HTMLInputElement).value = "";
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="file"
        accept="text/csv"
        onChange={handleImport}
        className="hidden"
      />
      <span className="text-sm text-primary underline cursor-pointer">
        Import CSV
      </span>
    </label>
  );
}
