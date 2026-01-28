/**
 * Vendor event dialog component
 */

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  PendingVendorEvent,
  VendorFormState,
} from "@/components/scheduling/drag-drop/types";
import { getVendorLabel } from "../../constants/templates";
import { toSqlTime } from "../../utils/timeHelpers";

interface Location {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  title?: string | null;
  role?: string | null;
  start_time: string;
  end_time: string;
}

interface VendorEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingVendorEvent: PendingVendorEvent | null;
  vendorForm: VendorFormState;
  locations: Location[];
  candidateVendorShifts: Shift[];
  onFormChange: (form: VendorFormState) => void;
  onCreateVendorEvent: (payload: {
    vendor_type: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    location_id: string | null;
    shift_id: string | null;
    notes: string | null;
  }) => Promise<void>;
}

export function VendorEventDialog({
  open,
  onOpenChange,
  pendingVendorEvent,
  vendorForm,
  locations,
  candidateVendorShifts,
  onFormChange,
  onCreateVendorEvent,
}: VendorEventDialogProps) {
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!pendingVendorEvent || !vendorForm.startTime || !vendorForm.endTime)
      return;
    try {
      await onCreateVendorEvent({
        vendor_type: pendingVendorEvent.vendor.vendorType,
        event_date: format(pendingVendorEvent.start, "yyyy-MM-dd"),
        start_time:
          toSqlTime(vendorForm.startTime) ??
          toSqlTime(format(pendingVendorEvent.start, "HH:mm")),
        end_time:
          toSqlTime(vendorForm.endTime) ??
          toSqlTime(format(pendingVendorEvent.end, "HH:mm")),
        location_id: vendorForm.locationId || null,
        shift_id: vendorForm.shiftId || null,
        notes: vendorForm.notes || null,
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to schedule vendor",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] z-50 bg-background">
        <DialogHeader>
          <DialogTitle>Schedule Vendor Visit</DialogTitle>
        </DialogHeader>
        {pendingVendorEvent ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor</Label>
                <Input
                  value={getVendorLabel(pendingVendorEvent.vendor.vendorType)}
                  disabled
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  value={format(pendingVendorEvent.start, "yyyy-MM-dd")}
                  disabled
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  value={vendorForm.startTime}
                  onChange={(e) =>
                    onFormChange({
                      ...vendorForm,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  value={vendorForm.endTime}
                  onChange={(e) =>
                    onFormChange({
                      ...vendorForm,
                      endTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <Select
                value={vendorForm.locationId}
                onValueChange={(value) =>
                  onFormChange({ ...vendorForm, locationId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border shadow-lg">
                  {locations.length === 0 ? (
                    <SelectItem value="" disabled>
                      No locations available
                    </SelectItem>
                  ) : (
                    locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to shift (optional)</Label>
              <Select
                value={vendorForm.shiftId}
                onValueChange={(value) =>
                  onFormChange({ ...vendorForm, shiftId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border shadow-lg max-h-60 overflow-y-auto">
                  <SelectItem value="">No linked shift</SelectItem>
                  {candidateVendorShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {`${shift.title || shift.role || "Shift"} • ${format(new Date(shift.start_time), "HH:mm")} - ${format(new Date(shift.end_time), "HH:mm")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={3}
                placeholder="Preparation details, contact, etc."
                value={vendorForm.notes}
                onChange={(e) =>
                  onFormChange({
                    ...vendorForm,
                    notes: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!vendorForm.startTime || !vendorForm.endTime}
              >
                Save visit
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select a time slot to schedule a vendor visit.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
