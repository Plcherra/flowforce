import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AppEvent, EventAttendee } from '@/hooks/useEvents';
import type { ShiftWithAssignments } from '@/hooks/scheduling/useSchedulingConsolidated';

const TYPE_LABEL: Record<NonNullable<AppEvent['type']>, string> = {
  meeting: 'Meeting',
  event: 'Event',
  vendor: 'Vendor visit',
};

interface EventDetailsPanelProps {
  event: AppEvent;
  relatedShifts?: ShiftWithAssignments[];
  onClose?: () => void;
  onViewShift?: (shiftId: string) => void;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'EEE, MMM d · HH:mm');
};

const uniqueAttendees = (attendees?: EventAttendee[]) => {
  if (!attendees) return [];
  const map = new Map<string, EventAttendee>();
  attendees.forEach((attendee) => {
    if (!attendee.id) return;
    if (!map.has(attendee.id)) {
      map.set(attendee.id, attendee);
    }
  });
  return Array.from(map.values());
};

export function EventDetailsPanel({ event, relatedShifts = [], onClose, onViewShift }: EventDetailsPanelProps) {
  const attendees = uniqueAttendees(event.attendees);
  const type = event.type ?? 'event';
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{event.title || 'Untitled session'}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {formatDateTime(event.start)}
              {event.end ? ` – ${format(new Date(event.end), 'HH:mm')}` : ''}
            </div>
          </div>
          <Badge style={{ backgroundColor: event.color ?? undefined }} className="capitalize text-white">
            {TYPE_LABEL[type as keyof typeof TYPE_LABEL] ?? 'Event'}
          </Badge>
        </div>
        {event.location && (
          <div className="text-sm text-muted-foreground">
            Location: <span className="font-medium text-foreground">{event.location}</span>
          </div>
        )}
        {event.description && (
          <div className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
            {event.description}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <section>
          <h4 className="text-sm font-semibold text-foreground">Attendees</h4>
          <ScrollArea className="mt-2 max-h-32 rounded-md border">
            <div className="p-2 space-y-1">
              {attendees.length === 0 && (
                <div className="text-xs text-muted-foreground py-2 px-1">No attendees recorded.</div>
              )}
              {attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center justify-between text-sm">
                  <div className="font-medium text-foreground">{attendee.name}</div>
                  {attendee.role && <span className="text-xs text-muted-foreground">{attendee.role}</span>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </section>

        {relatedShifts.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-foreground">Linked shifts</h4>
            <div className="mt-2 space-y-2">
              {relatedShifts.map((shift) => (
                <div key={shift.id} className="rounded-md border p-2">
                  <div className="text-sm font-medium text-foreground">
                    {shift.title || shift.job_position?.name || 'Shift'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(shift.start_time)} – {format(new Date(shift.end_time), 'HH:mm')}
                    {shift.location ? ` • ${shift.location}` : ''}
                  </div>
                  {onViewShift && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => onViewShift(shift.id)}
                    >
                      View shift
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {event.checklist && event.checklist.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold text-foreground">Checklist</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {event.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span className={`mt-1 h-2 w-2 rounded-full ${item.done ? 'bg-green-500' : 'bg-muted-foreground/50'}`} />
                  <div>
                    <div className="text-foreground">{item.text}</div>
                    {item.who && <div className="text-xs text-muted-foreground">Owner: {item.who}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {onClose && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
