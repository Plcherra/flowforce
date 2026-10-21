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
  const linked = useLinkedRecordReminders(userId, personalReminders);
  const reminders = linked.data ?? [];

  if (!userId) return null;
  if (linked.isLoading) return null;
  if (linked.isError) {
    return (
      <Alert>
        <AlertDescription>
          Reminders that open a task, form, or shift could not be loaded.
        </AlertDescription>
      </Alert>
    );
  }
  if (reminders.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open from a reminder</CardTitle>
        <CardDescription>
          Tasks, forms, and shifts you can already open. These stay reminders.
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
