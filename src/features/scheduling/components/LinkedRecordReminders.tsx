import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router-adapter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useLinkedRecordReminders,
  type PersonalScheduleReminder,
} from "@/features/scheduling/hooks/usePersonalScheduleReminders";

const KIND_LABEL = {
  task: "task",
  form: "form",
  shift: "shift",
} as const;

interface LinkedRecordRemindersProps {
  userId: string | null;
  personalReminders: PersonalScheduleReminder[];
}

export function LinkedRecordReminders({
  userId,
  personalReminders,
}: LinkedRecordRemindersProps) {
  const { t } = useTranslation();
  const linked = useLinkedRecordReminders(userId, personalReminders);
  const reminders = linked.data ?? [];

  if (!userId) return null;
  if (linked.isLoading) return null;
  if (linked.isError) {
    return (
      <Alert>
        <AlertDescription>
          {t("schedule.remindersThatOpenATaskFormOrShift")}
        </AlertDescription>
      </Alert>
    );
  }
  if (reminders.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("schedule.openFromAReminder")}</CardTitle>
        <CardDescription>
          {t("schedule.tasksFormsAndShiftsYouCanAlreadyOpen")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {reminders.map((reminder) => (
          <Link
            key={reminder.id}
            to={reminder.href}
            data-testid="open-linked-reminder"
            data-record-kind={reminder.kind}
            data-record-id={reminder.recordId}
            className="flex items-start justify-between gap-3 rounded-md border p-3 text-left hover:bg-muted/40"
            aria-label={`Open ${reminder.recordTitle}`}
          >
            <span>
              <span className="block text-sm font-medium">{reminder.title}</span>
              <span className="block text-xs text-muted-foreground">
                {reminder.recordTitle}
              </span>
            </span>
            <span className="text-xs font-medium text-primary">
              Open {KIND_LABEL[reminder.kind]}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
