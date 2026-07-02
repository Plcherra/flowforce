import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { EmployeeSelector } from "./EmployeeSelector";
import {
  X,
  FileText,
  Save,
  Eye,
  Trash2,
  Calendar as CalendarIcon,
  Plus,
  Minus,
  ShieldAlert,
} from "lucide-react";
import { useScheduling } from "@/contexts/SchedulingContext";
import { format } from "date-fns";
import { useEvents } from "@/hooks/useEvents";
import type {
  CopilotDraftWarning,
  CopilotScheduleMetadata,
} from "@/features/scheduling/services/autoScheduler";
import { logger } from "@/utils/logger";
import { buildShiftConflictWarnings } from "@/features/scheduling/utils/scheduleReadiness";

const vendorLabelLookup: Record<string, string> = {
  ecolab: "Ecolab Service",
  electrician: "Electrician",
  cleaning: "Cleaning Crew",
  inspection: "Health Inspection",
  general: "Vendor Visit",
};

const getVendorLabel = (vendorType: string) =>
  vendorLabelLookup[vendorType] ?? vendorType.replace(/_/g, " ");

const parseHourlyRate = (value: string) => {
  if (value.trim().length === 0) return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : null;
};

interface ShiftDetailsPanelProps {
  shiftId: string;
  onClose: () => void;
}

export function ShiftDetailsPanel({
  shiftId,
  onClose,
}: ShiftDetailsPanelProps) {
  const {
    shifts,
    timeOff,
    unavailability,
    vendorEvents,
    mutations: { updateSchedule, deleteSchedule },
  } = useScheduling();
  const {
    getEventsForShift,
    toggleChecklistItem,
    createVendorVisit,
    linkVisitToShifts,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [eventEdits, setEventEdits] = useState<
    Record<string, { title: string; location?: string | null }>
  >({});

  const shift = shifts.find((s) => s.id === shiftId);
  const copilotRequirements = shift?.requirements as
    | { copilot?: CopilotScheduleMetadata }
    | null
    | undefined;
  const copilotMeta = copilotRequirements?.copilot;
  const copilotWarnings: CopilotDraftWarning[] = copilotMeta?.warnings ?? [];

  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
    is_all_day: false,
    timezone: "UTC",
    color: "#3b82f6",
    hourly_rate: "",
  });

  useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title || "",
        start_time: format(new Date(shift.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(shift.end_time), "yyyy-MM-dd'T'HH:mm"),
        location: shift.location || "",
        notes: shift.notes || "",
        is_all_day: shift.is_all_day || false,
        timezone: shift.timezone || "UTC",
        color: shift.color || "#3b82f6",
        hourly_rate:
          typeof shift.hourly_rate === "number" ? String(shift.hourly_rate) : "",
      });
    }
  }, [shift]);

  const handleSave = async () => {
    if (!shift) return;

    setLoading(true);
    try {
      await updateSchedule(shift.id, {
        ...formData,
        hourly_rate: parseHourlyRate(formData.hourly_rate),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      });

      // Persist edits for linked events (title/location) using same Save action
      const linked = getEventsForShift(shift.id);
      for (const ev of linked) {
        const edit = eventEdits[ev.id];
        if (!edit) continue;
        const updates: Partial<{ title: string; location?: string | null }> =
          {};
        if (typeof edit.title === "string" && edit.title !== ev.title)
          updates.title = edit.title;
        if (typeof edit.location === "string" && edit.location !== ev.location)
          updates.location = edit.location;
        if (Object.keys(updates).length > 0) {
          await updateEvent(ev.id, updates);
        }
      }
    } catch (error) {
      logger.error("Error saving shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!shift) return;

    setLoading(true);
    try {
      await updateSchedule(shift.id, { is_published: true });
    } catch (error) {
      logger.error("Error publishing shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shift || !confirm("Are you sure you want to delete this shift?"))
      return;

    setLoading(true);
    try {
      await deleteSchedule(shift.id);
      onClose();
    } catch (error) {
      logger.error("Error deleting shift:", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  const linkedEvents = useMemo(
    () => (shift ? getEventsForShift(shift.id) : []),
    [getEventsForShift, shift],
  );
  const linkedVendorVisits = useMemo(
    () =>
      shift ? vendorEvents.filter((event) => event.shift_id === shift.id) : [],
    [shift, vendorEvents],
  );
  const conflictWarnings = useMemo(
    () =>
      shift
        ? buildShiftConflictWarnings({
            shift,
            shifts,
            timeOff,
            unavailability,
          })
        : [],
    [shift, shifts, timeOff, unavailability],
  );

  useEffect(() => {
    if (!shift) {
      setEventEdits({});
      return;
    }

    const buffer: Record<string, { title: string; location?: string | null }> =
      {};
    linkedEvents.forEach((event) => {
      buffer[event.id] = {
        title: event.title || "",
        location: event.location ?? null,
      };
    });
    setEventEdits(buffer);
  }, [linkedEvents, shift]);

  if (!shift) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shift Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Shift not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-testid="shift-details-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Shift Details
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              {linkedVendorVisits.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Vendor Visits</span>
                    <Badge variant="outline">{linkedVendorVisits.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {linkedVendorVisits.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-muted-foreground">
                          {getVendorLabel(event.vendor_type)}
                        </span>
                        <span className="text-muted-foreground">
                          {event.event_date
                            ? format(new Date(event.event_date), "MMM d")
                            : "—"}{" "}
                          · {(event.start_time ?? "").slice(0, 5) || "--"}-
                          {(event.end_time ?? "").slice(0, 5) || "--"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {conflictWarnings.length > 0 && (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-800">
                      Conflict Warnings
                    </span>
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-red-700"
                    >
                      {conflictWarnings.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {conflictWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className="rounded-md border border-red-200 bg-background p-2 text-sm text-muted-foreground"
                      >
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {copilotMeta && (
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">AI Copilot Draft</p>
                      <p className="text-xs text-muted-foreground">
                        Run {copilotMeta.runId?.slice?.(0, 8) ?? "—"} •{" "}
                        {copilotMeta.status ?? "draft-only"}
                      </p>
                    </div>
                    <Badge variant="outline">Draft</Badge>
                  </div>
                  {copilotWarnings.length > 0 ? (
                    <div className="space-y-2">
                      {copilotWarnings.map((warning, index) => (
                        <div
                          key={`${warning.code}-${index}`}
                          className="flex items-start gap-2 rounded border border-muted-foreground/30 bg-background p-2"
                        >
                          <ShieldAlert
                            className={`mt-1 h-4 w-4 ${warning.severity === "hard" ? "text-destructive" : "text-amber-500"}`}
                          />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {warning.severity === "hard"
                                ? "Blocking"
                                : "Advisory"}{" "}
                              • {warning.code.replace(/_/g, " ")}
                            </p>
                            <p className="text-sm text-foreground">
                              {warning.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No conflicts on this draft.
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Shift title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Shift location"
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hourly_rate: e.target.value,
                    })
                  }
                  placeholder="Optional labor cost rate"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="space-y-3">
              <Label>Assigned Employees</Label>
              <EmployeeSelector
                shiftId={shift.id}
                selectedEmployees={shift.assignments || []}
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={shift.is_published ? "default" : "secondary"}>
                {shift.is_published ? "Published" : "Draft"}
              </Badge>
              {shift.position_id && (
                <Badge variant="outline">
                  Position ID: {shift.position_id}
                </Badge>
              )}
            </div>

            {/* Linked Events */}
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Linked Events</h4>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const start = new Date(shift.start_time);
                    const end = new Date(shift.end_time);
                    const ev = await createVendorVisit({
                      title: "Vendor Visit",
                      description: "Vendor visit linked to this shift",
                      start: start.toISOString(),
                      end: end.toISOString(),
                      location: shift.location || "Site",
                      vendor: { name: "Vendor" },
                      related_shift_ids: [shift.id],
                      checklist: [
                        {
                          id: "sv1",
                          text: "Supervisor greet vendor",
                          done: false,
                          who: "supervisor",
                        },
                        {
                          id: "vd1",
                          text: "Perform service tasks",
                          done: false,
                          who: "vendor",
                        },
                      ],
                    });
                    await linkVisitToShifts(ev.id, [shift.id]);
                  }}
                  title="Add vendor visit"
                  aria-label="Add vendor visit"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {linkedEvents.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No events linked to this shift.
                </p>
              )}

              {linkedEvents.map((ev) => (
                <div key={ev.id} className="rounded-md border p-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={eventEdits[ev.id]?.title ?? ev.title}
                        onChange={(e) =>
                          setEventEdits((s) => ({
                            ...s,
                            [ev.id]: {
                              ...(s[ev.id] || { title: "" }),
                              title: e.target.value,
                            },
                          }))
                        }
                        className="h-8 text-sm"
                        placeholder="Event title"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(ev.start).toLocaleString()}{" "}
                        {ev.end
                          ? "– " + new Date(ev.end).toLocaleTimeString()
                          : ""}
                      </div>
                      <div className="mt-2">
                        <Input
                          value={
                            eventEdits[ev.id]?.location ?? ev.location ?? ""
                          }
                          onChange={(e) =>
                            setEventEdits((s) => ({
                              ...s,
                              [ev.id]: {
                                ...(s[ev.id] || { title: ev.title }),
                                location: e.target.value,
                              },
                            }))
                          }
                          className="h-8 text-sm"
                          placeholder="Location"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {ev.type || "event"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete event"
                        aria-label="Delete event"
                        onClick={async () => {
                          if (confirm("Delete this linked event?")) {
                            await deleteEvent(ev.id);
                          }
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {ev.checklist && ev.checklist.length > 0 && (
                    <div className="space-y-1">
                      {ev.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Checkbox
                            checked={item.done}
                            onCheckedChange={(v) =>
                              toggleChecklistItem(ev.id, item.id, Boolean(v))
                            }
                          />
                          <span>{item.text}</span>
                          {item.who && (
                            <Badge
                              variant="secondary"
                              className="ml-2 capitalize"
                            >
                              {item.who}
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Shift Tasks
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create task checklists for this shift
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                Save as Shift Template
              </Button>
              <Button variant="outline" className="w-full">
                Load from Template
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>

          {!shift.is_published && (
            <Button
              variant="outline"
              onClick={handlePublish}
              disabled={loading}
            >
              <Eye className="mr-2 h-4 w-4" />
              Publish this shift only
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Shift
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
