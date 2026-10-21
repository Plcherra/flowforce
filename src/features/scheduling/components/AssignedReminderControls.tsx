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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const label = title || "reminder";

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
        title: allow ? "Deactivate allowed" : "Deactivate turned off",
        description: allow
          ? "That person can turn this reminder off."
          : "That person can no longer turn this reminder off.",
      });
    } catch {
      toast({
        title: "Could not update deactivate",
        description: "Try again in a moment.",
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
        title: "Reminder turned off",
        description: "It is hidden for you. Other people's reminders stay.",
      });
    } catch {
      toast({
        title: "Could not turn the reminder off",
        description: "Try again in a moment.",
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
          aria-label={`Allow deactivate ${label}`}
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
          Deactivate
        </Button>
      ) : null}
    </div>
  );
}
