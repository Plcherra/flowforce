import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useEvents, type EventAttendee } from '@/hooks/useEvents';
import { useScheduling } from '@/contexts/SchedulingContext';
import { Schedule } from '@/types/common';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface CreateVendorVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (eventId: string) => void;
}

export function CreateVendorVisitDialog({ open, onOpenChange, onCreated }: CreateVendorVisitDialogProps) {
  const { shifts } = useScheduling();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { createVendorVisit } = useEvents();

  const [title, setTitle] = useState('Vendor Visit');
  const [vendorName, setVendorName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [selectedShiftIds, setSelectedShiftIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      // initialize with now + 1h
      const s = new Date();
      const e = new Date(s.getTime() + 60 * 60 * 1000);
      setStart(s.toISOString().slice(0, 16));
      setEnd(e.toISOString().slice(0, 16));
      setSelectedShiftIds({});
    }
  }, [open]);

  const suggestions = useMemo(() => {
    if (!start || !end) return [] as Schedule[];
    const s = new Date(start);
    const e = new Date(end);
    const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
      return aStart <= bEnd && bStart <= aEnd;
    };
    return (shifts || []).filter((sh) => {
      const shS = new Date(sh.start_time);
      const shE = new Date(sh.end_time);
      const timeOk = overlaps(s, e, shS, shE);
      const locOk = !location || (sh.location || '').toLowerCase().includes(location.toLowerCase());
      return timeOk && locOk;
    }).slice(0, 20);
  }, [shifts, start, end, location]);

  const toggleShift = (id: string, next: boolean | string) => {
    const v = Boolean(next);
    setSelectedShiftIds(prev => ({ ...prev, [id]: v }));
  };

  const buildAttendees = (shiftIds: string[]): EventAttendee[] => {
    if (!shiftIds.length) return [];
    const map = new Map<string, EventAttendee>();
    shifts
      .filter((shift) => shiftIds.includes(shift.id))
      .forEach((shift) => {
        shift.assignments?.forEach((assignment) => {
          if (assignment.user?.id) {
            const name = `${assignment.user.first_name ?? ''} ${assignment.user.last_name ?? ''}`.trim() || 'Team member';
            map.set(assignment.user.id, {
              id: assignment.user.id,
              name,
              avatar_url: assignment.user.avatar_url ?? null,
              role: shift.job_position?.name ?? assignment.user.role ?? undefined,
            });
          }
        });
      });
    return Array.from(map.values());
  };

  const handleCreate = async () => {
    if (!start || !end || !title.trim() || !vendorName.trim()) return;

    const companyId = profile?.companyId ?? profile?.company_id ?? null;
    if (!companyId) {
      toast({
        title: 'Missing company context',
        description: 'You need an active company to create vendor visits.',
        variant: 'destructive',
      });
      return;
    }

    let startIso: Date;
    let endIso: Date;
    try {
      startIso = new Date(start);
      endIso = new Date(end);
      if (Number.isNaN(startIso.getTime()) || Number.isNaN(endIso.getTime())) {
        throw new Error('Invalid date');
      }
    } catch {
      toast({
        title: 'Invalid date',
        description: 'Please provide valid start and end times.',
        variant: 'destructive',
      });
      return;
    }

    const linkedShiftIds = Object.entries(selectedShiftIds)
      .filter(([, v]) => v)
      .map(([id]) => id);

    try {
      const visit = await createVendorVisit({
        title,
        description: description || undefined,
        location: location || undefined,
        start: startIso.toISOString(),
        end: endIso.toISOString(),
        related_shift_ids: linkedShiftIds,
        attendees: buildAttendees(linkedShiftIds),
        checklist: [
          { id: 'sv-greet', text: 'Supervisor greet vendor', done: false, who: 'supervisor' },
          { id: 'vd-complete', text: 'Vendor completes service scope', done: false, who: 'vendor' },
        ],
        vendor: { name: vendorName, service_type: serviceType },
      });

      if (visit.id) {
        onCreated?.(visit.id);
      }

      toast({
        title: 'Vendor visit created',
        description: `${vendorName} scheduled for ${new Date(start).toLocaleString()}.`,
      });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Vendor visit not saved',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Vendor Visit</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Vendor Name</Label>
            <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="e.g., ACME Electric" />
          </div>
          <div>
            <Label>Service Type</Label>
            <Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} placeholder="Electrical, HVAC, etc." />
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site/Area" />
          </div>
          <div>
            <Label>Start</Label>
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Suggested Shifts (time/location overlap)</div>
          <div className="max-h-48 overflow-auto border rounded-md p-2 space-y-2">
            {suggestions.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-4">No matching shifts. Adjust time or location to find candidates.</div>
            )}
            {suggestions.map((sh) => (
              <label key={sh.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!selectedShiftIds[sh.id]} onCheckedChange={(v) => toggleShift(sh.id, v)} />
                <span className="truncate">
                  {sh.title || sh.job_position?.name || 'Shift'} – {new Date(sh.start_time).toLocaleTimeString()} to {new Date(sh.end_time).toLocaleTimeString()} {sh.location ? `• ${sh.location}` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!vendorName || !title || !start || !end}>Create Visit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
