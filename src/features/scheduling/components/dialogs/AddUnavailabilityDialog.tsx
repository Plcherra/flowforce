/**
 * Add unavailability dialog component
 */

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  REPEAT_CHOICES,
  patternFromChoice,
  type RepeatChoice,
} from "@/features/scheduling/utils/repeatPattern";
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
    repeat?: ReturnType<typeof patternFromChoice>;
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
  const { t } = useTranslation();
  const [repeat, setRepeat] = useState<RepeatChoice>("none");
  const handleSubmit = async () => {
    if (!userId || !start || !end) return;
    const anchor = start.slice(0, 10);
    const success = await onSubmit({
      userId,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      reason: reason || null,
      repeat: patternFromChoice(repeat, anchor),
    });
    if (success) {
      onOpenChange(false);
      onUserIdChange("");
      onStartChange("");
      onEndChange("");
      onReasonChange("");
      setRepeat("none");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-50 max-h-[85dvh] w-[calc(100%-1rem)] overflow-y-auto bg-background sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("schedule.addUnavailability")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("schedule.user")}</Label>
            <Select value={userId} onValueChange={onUserIdChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("schedule.selectAUser")} />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("schedule.start")}</Label>
              <Input
                type="datetime-local"
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("schedule.end")}</Label>
              <Input
                type="datetime-local"
                value={end}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("schedule.repeats")}</Label>
            <Select value={repeat} onValueChange={(value) => setRepeat(value as RepeatChoice)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                {REPEAT_CHOICES.map((choice) => (
                  <SelectItem key={choice.id} value={choice.id}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("schedule.reason")}</Label>
            <Input
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={t("schedule.eGClassAppointment")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("schedule.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!userId || !start || !end}>
              {t("schedule.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
