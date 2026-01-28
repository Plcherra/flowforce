/**
 * Multi-add shift dialog component
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

interface MultiAddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekDays: Date[];
  locationFilter?: string;
  multiTitle: string;
  multiStart: string;
  multiEnd: string;
  multiDays: number[];
  multiHeadcount: number;
  onTitleChange: (title: string) => void;
  onStartChange: (start: string) => void;
  onEndChange: (end: string) => void;
  onDaysChange: (days: number[]) => void;
  onHeadcountChange: (headcount: number) => void;
  onSubmit: (
    payloads: Array<{
      title: string;
      role: string | null;
      color: string | null;
      start_time: string;
      end_time: string;
      location: string;
      is_all_day: boolean;
      timezone: string;
      required_headcount: number;
      notes: string | null;
      break_minutes: number;
      hourly_rate: number | null;
      is_published: boolean;
      is_template: boolean;
      template_id: string | null;
      position_id: string | null;
      status: string;
      user_id: string | null;
      requirements: unknown[];
    }>,
  ) => Promise<boolean>;
}

export function MultiAddShiftDialog({
  open,
  onOpenChange,
  weekDays,
  locationFilter,
  multiTitle,
  multiStart,
  multiEnd,
  multiDays,
  multiHeadcount,
  onTitleChange,
  onStartChange,
  onEndChange,
  onDaysChange,
  onHeadcountChange,
  onSubmit,
}: MultiAddShiftDialogProps) {
  const handleSubmit = async () => {
    const startParts = multiStart.split(":");
    const endParts = multiEnd.split(":");
    const payloads = multiDays.map((index) => {
      const day = weekDays[index];
      const start = new Date(day);
      start.setHours(
        Number.parseInt(startParts[0] ?? "9", 10),
        Number.parseInt(startParts[1] ?? "0", 10),
        0,
        0,
      );
      const end = new Date(day);
      end.setHours(
        Number.parseInt(endParts[0] ?? "17", 10),
        Number.parseInt(endParts[1] ?? "0", 10),
        0,
        0,
      );
      return {
        title: multiTitle,
        role: "Staff",
        color: "#3b82f6",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location: locationFilter ?? "",
        is_all_day: false,
        timezone: "UTC",
        required_headcount: multiHeadcount,
        notes: null,
        break_minutes: 30,
        hourly_rate: 15.0,
        is_published: false,
        is_template: false,
        template_id: null,
        position_id: null,
        status: "scheduled",
        user_id: null,
        requirements: [],
      };
    });

    const success = await onSubmit(payloads);
    if (success) {
      onOpenChange(false);
      onDaysChange([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add Multiple Shifts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="mtitle">Title</Label>
            <Input
              id="mtitle"
              value={multiTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={multiStart}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={multiEnd}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Days of this week</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {weekDays.map((d, idx) => (
                <Button
                  key={idx}
                  type="button"
                  size="sm"
                  variant={multiDays.includes(idx) ? "default" : "outline"}
                  onClick={() =>
                    onDaysChange(
                      multiDays.includes(idx)
                        ? multiDays.filter((i) => i !== idx)
                        : [...multiDays, idx],
                    )
                  }
                >
                  {format(d, "EEE")}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Required headcount</Label>
            <Input
              type="number"
              min={1}
              value={multiHeadcount}
              onChange={(e) =>
                onHeadcountChange(Number.parseInt(e.target.value) || 1)
              }
              className="w-32"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={multiDays.length === 0}>
              Create {multiDays.length} shift{multiDays.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
