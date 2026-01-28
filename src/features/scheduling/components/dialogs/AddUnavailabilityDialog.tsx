/**
 * Add unavailability dialog component
 */

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

interface Employee {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

interface AddUnavailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  userId: string;
  start: string;
  end: string;
  reason: string;
  onUserIdChange: (userId: string) => void;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
  onReasonChange: (reason: string) => void;
  onSubmit: (payload: {
    userId: string;
    start: string;
    end: string;
    reason?: string | null;
  }) => Promise<boolean>;
}

export function AddUnavailabilityDialog({
  open,
  onOpenChange,
  employees,
  userId,
  start,
  end,
  reason,
  onUserIdChange,
  onStartChange,
  onEndChange,
  onReasonChange,
  onSubmit,
}: AddUnavailabilityDialogProps) {
  const handleSubmit = async () => {
    if (!userId || !start || !end) return;
    const success = await onSubmit({
      userId,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      reason: reason || null,
    });
    if (success) {
      onOpenChange(false);
      onUserIdChange("");
      onStartChange("");
      onEndChange("");
      onReasonChange("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] z-50 bg-background">
        <DialogHeader>
          <DialogTitle>Add Unavailability</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>User</Label>
            <Select value={userId} onValueChange={onUserIdChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                {employees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="e.g., class, appointment"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!userId || !start || !end}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
