import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useEvents, type AppEvent, type EventAttendee } from "@/hooks/useEvents";
import { useProfile } from "@/hooks/useProfile";
import type { Schedule } from "@/types/common";
import { useCreateCalendarEvent } from "@/features/calendar/hooks/useCreateCalendarEvent";
import {
  defaultEventWindow,
  fromDatetimeLocalValue,
  isEndAfterStart,
} from "@/features/calendar/utils/calendarBoard";
import { useTranslation } from "react-i18next";

type SessionType = "meeting" | "event";

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: SessionType;
  onCreated?: (event: AppEvent) => void;
}

type SelectionRecord = Record<string, boolean>;

export function CreateEventDialog({
  open,
  onOpenChange,
  defaultType = "event",
  onCreated,
}: CreateEventDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    shifts,
    teamMembers: roster,
    loading: schedulingLoading,
  } = useScheduling();
  const { events } = useEvents();
  const { profile } = useProfile();
  const { createEvent } = useCreateCalendarEvent();

  const [sessionType, setSessionType] = useState<SessionType>(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [participantQuery, setParticipantQuery] = useState("");
  const [selectedParticipants, setSelectedParticipants] =
    useState<SelectionRecord>({});
  const [selectedShiftIds, setSelectedShiftIds] = useState<SelectionRecord>({});

  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  const employees = roster ?? [];
  const employeesLoading = schedulingLoading;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  const safeShifts = shifts ?? [];

  useEffect(() => {
    if (open) {
      setSessionType(defaultType);
      setTitle("");
      setDescription("");
      setLocation("");
      const window = defaultEventWindow();
      setStart(window.start);
      setEnd(window.end);
      setParticipantQuery("");
      setSelectedParticipants({});
      setSelectedShiftIds({});
    }
  }, [open, defaultType]);

  const attendeeOptions: EventAttendee[] = useMemo(() => {
    const map = new Map<string, EventAttendee>();

    employees.forEach((employee) => {
      if (!employee.id) return;
      const name =
        `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
        employee.email ||
        t("calendar.teamMember");
      map.set(employee.id, {
        id: employee.id,
        name,
        avatar_url: employee.avatar_url ?? null,
        role: employee.position?.name ?? employee.role ?? null,
      });
    });

    events.forEach((event) => {
      (event.attendees ?? []).forEach((attendee) => {
        if (!attendee?.id || map.has(attendee.id)) return;
        map.set(attendee.id, {
          id: attendee.id,
          name: attendee.name,
          avatar_url: attendee.avatar_url ?? null,
          role: attendee.role ?? null,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [employees, events, t]);

  const filteredAttendees = !participantQuery.trim()
    ? attendeeOptions
    : attendeeOptions.filter((attendee) =>
        attendee.name
          .toLowerCase()
          .includes(participantQuery.trim().toLowerCase()),
      );

  const attendeeMap = useMemo(() => {
    const map = new Map<string, EventAttendee>();
    attendeeOptions.forEach((attendee) => {
      map.set(attendee.id, attendee);
    });
    return map;
  }, [attendeeOptions]);

  const shiftSuggestions = useMemo(() => {
    if (!start || !end) return [] as Schedule[];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const overlaps = (
      leftStart: Date,
      leftEnd: Date,
      rightStart: Date,
      rightEnd: Date,
    ) => {
      const leftStartMs = leftStart.getTime();
      const leftEndMs = leftEnd.getTime();
      const rightStartMs = rightStart.getTime();
      const rightEndMs = rightEnd.getTime();
      return leftStartMs <= rightEndMs && rightStartMs <= leftEndMs;
    };
    return safeShifts
      .filter((shift) => {
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        const timeOverlap = overlaps(startDate, endDate, shiftStart, shiftEnd);
        const locationMatch =
          !location ||
          (shift.location ?? "").toLowerCase().includes(location.toLowerCase());
        return timeOverlap && locationMatch;
      })
      .slice(0, 20);
  }, [end, location, safeShifts, start]);

  const toggleSelection =
    (setState: Dispatch<SetStateAction<SelectionRecord>>) =>
    (id: string, next: boolean | string) => {
      const value = Boolean(next);
      setState((prev) => ({ ...prev, [id]: value }));
    };

  const buildAttendeesFromSelections = (
    participantIds: string[],
    shiftIds: string[],
  ): EventAttendee[] => {
    const map = new Map<string, EventAttendee>();
    const push = (attendee: EventAttendee) => {
      if (!attendee.id) return;
      if (!map.has(attendee.id)) {
        map.set(attendee.id, attendee);
      }
    };

    participantIds.forEach((id) => {
      const match = attendeeMap.get(id);
      if (match) push(match);
    });

    if (shiftIds.length > 0) {
      safeShifts
        .filter((shift) => shiftIds.includes(shift.id))
        .forEach((shift) => {
          shift.assignments?.forEach((assignment) => {
            if (!assignment.user?.id) return;
            const user = assignment.user;
            const name =
              `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
              t("calendar.teamMember");
            push({
              id: user.id,
              name,
              avatar_url: user.avatar_url ?? null,
              role: shift.job_position?.name ?? user.role ?? undefined,
            });
          });
        });
    }

    return Array.from(map.values());
  };

  const handleCreate = async () => {
    const startIso = fromDatetimeLocalValue(start);
    const endIso = fromDatetimeLocalValue(end);
    if (!title.trim() || !startIso || !endIso) {
      toast({
        title: t("calendar.missingInformation"),
        description: t("calendar.titleStartEndRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!isEndAfterStart(startIso, endIso)) {
      toast({
        title: t("calendar.invalidDate"),
        description: t("calendar.endBeforeStart"),
        variant: "destructive",
      });
      return;
    }

    const companyId = profile?.companyId ?? profile?.company_id ?? null;
    if (!companyId) {
      toast({
        title: t("calendar.missingCompany"),
        description: t("calendar.needCompanyToCreate"),
        variant: "destructive",
      });
      return;
    }

    const selectedParticipantIds = Object.entries(selectedParticipants)
      .filter(([, value]) => value)
      .map(([id]) => id);
    const selectedShiftList = Object.entries(selectedShiftIds)
      .filter(([, value]) => value)
      .map(([id]) => id);

    const attendees = buildAttendeesFromSelections(
      selectedParticipantIds,
      selectedShiftList,
    );

    try {
      const created = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        type: sessionType,
        start: startIso.toISOString(),
        end: endIso.toISOString(),
        attendees,
        related_shift_ids: selectedShiftList,
      });

      if (created?.id) {
        onCreated?.(created);
      }

      toast({
        title:
          sessionType === "meeting"
            ? t("calendar.meetingScheduled")
            : t("calendar.eventCreated"),
        description: `${title.trim()} · ${startIso.toLocaleString()}`,
      });

      onOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("calendar.addToCalendar")}</DialogTitle>
          <DialogDescription>{t("calendar.chooseMeetingOrEventThenAddDetailsInvite")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="session-title">{t("dashboard.title")}</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                sessionType === "meeting"
                  ? t("calendar.meetingPlaceholder")
                  : t("calendar.eventPlaceholder")
              }
            />
          </div>
          <div>
            <Label htmlFor="session-type">{t("resources.details.type")}</Label>
            <Select
              value={sessionType}
              onValueChange={(value) => setSessionType(value as SessionType)}
            >
              <SelectTrigger id="session-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">{t("sections.meeting")}</SelectItem>
                <SelectItem value="event">{t("dashboard.event")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="session-start">{t("schedule.start")}</Label>
            <Input
              id="session-start"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="session-end">{t("schedule.end")}</Label>
            <Input
              id="session-end"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="session-location">{t("schedule.location")}</Label>
            <Input
              id="session-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t("calendar.conferenceRoomOnSiteVirtualLink")}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="session-description">{t("registration.companyInfo.description")}</Label>
            <Textarea
              id="session-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("calendar.agendaDialInDetailsGoals")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>{t("calendar.inviteParticipants")}</Label>
              <Input
                value={participantQuery}
                onChange={(event) => setParticipantQuery(event.target.value)}
                placeholder={t("calendar.searchTeam")}
                className="h-8 w-40"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-auto space-y-2 pr-2">
              {employeesLoading ? (
                <div className="text-xs text-muted-foreground px-1 py-2">{t("calendar.loadingTeamDirectory")}</div>
              ) : filteredAttendees.length === 0 ? (
                <div className="text-xs text-muted-foreground px-1 py-2">{t("calendar.noMatchingPeopleFoundUpdateYourDirectoryOr")}</div>
              ) : (
                filteredAttendees.map((attendee) => (
                  <label
                    key={attendee.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={!!selectedParticipants[attendee.id]}
                      onCheckedChange={(value) =>
                        toggleSelection(setSelectedParticipants)(
                          attendee.id,
                          value,
                        )
                      }
                    />
                    <div>
                      <div className="font-medium leading-none">
                        {attendee.name}
                      </div>
                      {attendee.role && (
                        <div className="text-xs text-muted-foreground">
                          {attendee.role}
                        </div>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>{t("calendar.linkToScheduledShiftsOptional")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("calendar.selectTheShiftsThisSessionSupportsLinkedShifts")}</p>
            <div className="max-h-48 overflow-auto space-y-2 pr-2 border rounded-md p-2">
              {shiftSuggestions.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">{t("calendar.noOverlappingShiftsFoundForTheSelectedTime")}</div>
              )}
              {shiftSuggestions.map((shift) => (
                <label
                  key={shift.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Checkbox
                    checked={!!selectedShiftIds[shift.id]}
                    onCheckedChange={(value) =>
                      toggleSelection(setSelectedShiftIds)(shift.id, value)
                    }
                  />
                  <div>
                    <div className="font-medium leading-none">
                      {shift.title || shift.job_position?.name || t("calendar.shiftFallback")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(shift.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(shift.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {shift.location ? ` • ${shift.location}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={handleCreate}>{t("calendar.saveToCalendar")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
