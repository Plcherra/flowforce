import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useScheduling } from '@/contexts/SchedulingContext';
import { useEvents, type EventAttendee } from '@/hooks/useEvents';
import type { Schedule } from '@/types/common';

type SessionType = 'meeting' | 'event';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: SessionType;
}

type SelectionRecord = Record<string, boolean>;

export function CreateEventDialog({ open, onOpenChange, defaultType = 'meeting' }: CreateEventDialogProps) {
  const { toast } = useToast();
  const { shifts } = useScheduling();
  const { createEvent } = useEvents();

  const [sessionType, setSessionType] = useState<SessionType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<SelectionRecord>({});
  const [selectedShiftIds, setSelectedShiftIds] = useState<SelectionRecord>({});

  useEffect(() => {
    if (open) {
      setSessionType(defaultType);
      setTitle(defaultType === 'meeting' ? 'New Meeting' : 'New Event');
      setDescription('');
      setLocation('');
      const now = new Date();
      const soon = new Date(now.getTime() + 60 * 60 * 1000);
      setStart(now.toISOString().slice(0, 16));
      setEnd(soon.toISOString().slice(0, 16));
      setParticipantQuery('');
      setSelectedParticipants({});
      setSelectedShiftIds({});
    }
  }, [open, defaultType]);

  const teamMembers = useMemo(() => {
    const map = new Map<string, EventAttendee>();
    shifts.forEach((shift) => {
      shift.assignments?.forEach((assignment) => {
        const user = assignment.user;
        if (!user?.id) return;
        if (!map.has(user.id)) {
          const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Team member';
          map.set(user.id, {
            id: user.id,
            name,
            avatar_url: user.avatar_url ?? null,
            role: user.role ?? shift.job_position?.name ?? undefined,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts]);

  const filteredMembers = useMemo(() => {
    if (!participantQuery.trim()) return teamMembers;
    return teamMembers.filter((member) =>
      member.name.toLowerCase().includes(participantQuery.trim().toLowerCase()),
    );
  }, [participantQuery, teamMembers]);

  const shiftSuggestions = useMemo(() => {
    if (!start || !end) return [] as Schedule[];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const overlaps = (a: Date, b: Date, c: Date, d: Date) => a <= d && c <= b;
    return (shifts ?? [])
      .filter((shift) => {
        const shiftStart = new Date(shift.start_time);
        const shiftEnd = new Date(shift.end_time);
        const timeOverlap = overlaps(startDate, endDate, shiftStart, shiftEnd);
        const locationMatch = !location || (shift.location ?? '').toLowerCase().includes(location.toLowerCase());
        return timeOverlap && locationMatch;
      })
      .slice(0, 20);
  }, [end, location, shifts, start]);

  const toggleSelection = (setState: (value: SelectionRecord) => void) => (id: string, next: boolean | string) => {
    const value = Boolean(next);
    setState((prev) => ({ ...prev, [id]: value }));
  };

  const buildAttendeesFromSelections = (participantIds: string[], shiftIds: string[]): EventAttendee[] => {
    const map = new Map<string, EventAttendee>();
    const push = (attendee: EventAttendee) => {
      if (!attendee.id) return;
      if (!map.has(attendee.id)) {
        map.set(attendee.id, attendee);
      }
    };

    participantIds.forEach((id) => {
      const match = teamMembers.find((member) => member.id === id);
      if (match) push(match);
    });

    if (shiftIds.length > 0) {
      shifts
        .filter((shift) => shiftIds.includes(shift.id))
        .forEach((shift) => {
          shift.assignments?.forEach((assignment) => {
            if (!assignment.user?.id) return;
            const user = assignment.user;
            const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || 'Team member';
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
    if (!title.trim() || !start || !end) {
      toast({
        title: 'Missing information',
        description: 'Title, start time and end time are required.',
        variant: 'destructive',
      });
      return;
    }

    const selectedParticipantIds = Object.entries(selectedParticipants)
      .filter(([, value]) => value)
      .map(([id]) => id);
    const selectedShiftList = Object.entries(selectedShiftIds)
      .filter(([, value]) => value)
      .map(([id]) => id);

    const attendees = buildAttendeesFromSelections(selectedParticipantIds, selectedShiftList);

    await createEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      location: location.trim() || undefined,
      type: sessionType,
      related_shift_ids: selectedShiftList,
      attendees,
    });

    toast({
      title: sessionType === 'meeting' ? 'Meeting scheduled' : 'Event created',
      description: `${title.trim()} on ${new Date(start).toLocaleString()}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{sessionType === 'meeting' ? 'Schedule meeting' : 'Create event'}</DialogTitle>
          <DialogDescription>
            Capture details, invite team members, and link the session to shifts on the schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="session-title">Title</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={sessionType === 'meeting' ? 'Quarterly planning meeting' : 'All hands event'}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={sessionType} onValueChange={(value) => setSessionType(value as SessionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="session-start">Start</Label>
            <Input
              id="session-start"
              type="datetime-local"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="session-end">End</Label>
            <Input
              id="session-end"
              type="datetime-local"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="session-location">Location</Label>
            <Input
              id="session-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Conference room, on-site, virtual link…"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="session-description">Description</Label>
            <Textarea
              id="session-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Agenda, dial-in details, goals…"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4">
          <div>
            <div className="flex items-center justify-between">
              <Label>Invite participants</Label>
              <Input
                value={participantQuery}
                onChange={(event) => setParticipantQuery(event.target.value)}
                placeholder="Search team"
                className="h-8 w-40"
              />
            </div>
            <div className="mt-2 max-h-48 overflow-auto space-y-2 pr-2">
              {filteredMembers.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">
                  No team members found. Assign team members to shifts to invite them here.
                </div>
              )}
              {filteredMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!selectedParticipants[member.id]}
                    onCheckedChange={(value) => toggleSelection(setSelectedParticipants)(member.id, value)}
                  />
                  <div>
                    <div className="font-medium leading-none">{member.name}</div>
                    {member.role && <div className="text-xs text-muted-foreground">{member.role}</div>}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Link to scheduled shifts</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select the shifts this session supports. Linked shifts will surface the meeting to assigned staff.
            </p>
            <div className="max-h-48 overflow-auto space-y-2 pr-2 border rounded-md p-2">
              {shiftSuggestions.length === 0 && (
                <div className="text-xs text-muted-foreground px-1 py-2">
                  No overlapping shifts found for the selected time window.
                </div>
              )}
              {shiftSuggestions.map((shift) => (
                <label key={shift.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={!!selectedShiftIds[shift.id]}
                    onCheckedChange={(value) => toggleSelection(setSelectedShiftIds)(shift.id, value)}
                  />
                  <div>
                    <div className="font-medium leading-none">
                      {shift.title || shift.job_position?.name || 'Shift'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {shift.location ? ` • ${shift.location}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create {sessionType === 'meeting' ? 'meeting' : 'event'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
