/**
 * Add time off dialog component
 */

import { useTranslation } from "react-i18next";
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

interface AddTimeOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  userId: string;
  startDate: string;
  endDate: string;
  type: "vacation" | "sick" | "personal" | "other";
  reason: string;
  onUserIdChange: (userId: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTypeChange: (type: "vacation" | "sick" | "personal" | "other") => void;
  onReasonChange: (reason: string) => void;
  onSubmit: (payload: {
    userId: string;
    startDate: string;
    endDate: string;
    type: "vacation" | "sick" | "personal" | "other";
    reason?: string | null;
  }) => Promise<boolean>;
}

export function AddTimeOffDialog({
  open,
  onOpenChange,
  employees,
  userId,
  startDate,
  endDate,
  type,
  reason,
  onUserIdChange,
  onStartDateChange,
  onEndDateChange,
  onTypeChange,
  onReasonChange,
  onSubmit,
}: AddTimeOffDialogProps) {
  const { t } = useTranslation();
  const handleSubmit = async () => {
    if (!userId || !startDate || !endDate) return;
    const success = await onSubmit({
      userId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      type,
      reason: reason || null,
    });
    if (success) {
      onOpenChange(false);
      onUserIdChange("");
      onStartDateChange("");
      onEndDateChange("");
      onReasonChange("");
      onTypeChange("vacation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-50 max-h-[85dvh] w-[calc(100%-1rem)] overflow-y-auto bg-background sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("schedule.addTimeOff")}</DialogTitle>
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
              <Label>{t("schedule.startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("schedule.endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("schedule.type")}</Label>
              <Select
                value={type}
                onValueChange={(value) => {
                  if (
                    value === "vacation" ||
                    value === "sick" ||
                    value === "personal" ||
                    value === "other"
                  ) {
                    onTypeChange(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background border shadow-lg">
                  <SelectItem value="vacation">{t("schedule.vacation")}</SelectItem>
                  <SelectItem value="sick">{t("schedule.sick")}</SelectItem>
                  <SelectItem value="personal">{t("schedule.personal")}</SelectItem>
                  <SelectItem value="other">{t("schedule.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("schedule.reason")}</Label>
              <Input
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder={t("schedule.optional")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("schedule.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!userId || !startDate || !endDate}
            >
              {t("schedule.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
