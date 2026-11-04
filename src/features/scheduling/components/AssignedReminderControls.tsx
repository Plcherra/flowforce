import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  deactivateAssignedReminder,
  setReminderAllowDeactivate,
} from "@/features/scheduling/repositories/scheduleRemindersRepository";

interface AssignedReminderControlsProps {
  companyId: string | null;
  reminderId: string;
  title: string;
  allowDeactivate: boolean;
  isAssignee: boolean;
  canGrantDeactivate: boolean;
}

export function AssignedReminderControls({
  companyId,
  reminderId,
  title,
  allowDeactivate,
  isAssignee,
  canGrantDeactivate,
}: AssignedReminderControlsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const label = title || t("schedule.reminderWord");

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["schedule-assignment-reminders", companyId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["linked-schedule-reminders"],
    });
  };

  const setFlag = async (allow: boolean) => {
    setSaving(true);
    try {
      await setReminderAllowDeactivate(reminderId, allow);
      await refresh();
      toast({
        title: allow
          ? t("schedule.deactivateAllowed")
          : t("schedule.deactivateTurnedOff"),
        description: allow
          ? t("schedule.deactivateAllowedHelp")
          : t("schedule.deactivateTurnedOffHelp"),
      });
    } catch {
      toast({
        title: t("schedule.couldNotUpdateDeactivate"),
        description: t("schedule.pleaseTryAgainInAFewMoments"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    setSaving(true);
    try {
      await deactivateAssignedReminder(reminderId);
      await refresh();
      toast({
        title: t("schedule.reminderTurnedOff"),
        description: t("schedule.reminderTurnedOffHelp"),
      });
    } catch {
      toast({
        title: t("schedule.couldNotTurnReminderOff"),
        description: t("schedule.pleaseTryAgainInAFewMoments"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canGrantDeactivate && !(isAssignee && allowDeactivate)) return null;

  return (
    <div className="flex items-center gap-2">
      {canGrantDeactivate ? (
        <Switch
          checked={allowDeactivate}
          disabled={saving}
          onCheckedChange={(checked) => void setFlag(checked)}
          aria-label={t("schedule.allowDeactivateNamed", { title: label })}
          data-testid="allow-deactivate-reminder"
        />
      ) : null}
      {isAssignee && allowDeactivate ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          data-testid="deactivate-reminder"
          onClick={() => void deactivate()}
        >
          {t("schedule.deactivate")}
        </Button>
      ) : null}
    </div>
  );
}
