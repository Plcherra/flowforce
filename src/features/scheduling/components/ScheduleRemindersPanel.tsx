import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bell, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { usePersonalScheduleReminders } from "@/features/scheduling/hooks/usePersonalScheduleReminders";
import {
  createScheduleAssignmentReminder,
  deleteScheduleAssignmentReminder,
  fetchScheduleAssignmentReminders,
} from "@/features/scheduling/repositories/scheduleRemindersRepository";

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function weekdayLabel(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function personName(person?: { first_name?: string | null; last_name?: string | null }) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
  return name || "Team member";
}

interface ScheduleRemindersPanelProps {
  canAssignReminders: boolean;
}

export function ScheduleRemindersPanel({
  canAssignReminders,
}: ScheduleRemindersPanelProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const profileId = profile?.id ?? null;
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const personal = usePersonalScheduleReminders(profileId);
  const queryClient = useQueryClient();

  const [personalTitle, setPersonalTitle] = useState("");
  const [personalDay, setPersonalDay] = useState<string>("sunday");
  const [personalTime, setPersonalTime] = useState("18:00");

  const [teamTitle, setTeamTitle] = useState("");
  const [teamMessage, setTeamMessage] = useState("");
  const [teamDay, setTeamDay] = useState<string>("thursday");
  const [teamTime, setTeamTime] = useState("10:00");
  const [teamTarget, setTeamTarget] = useState<string>("me");
  const [savingTeam, setSavingTeam] = useState(false);

  const assignedQuery = useQuery({
    queryKey: [
      "schedule-assignment-reminders",
      companyId,
      canAssignReminders ? "team" : profileId,
    ],
    enabled: Boolean(companyId) && (canAssignReminders || Boolean(profileId)),
    queryFn: () =>
      fetchScheduleAssignmentReminders(canAssignReminders ? null : profileId),
  });

  const peopleQuery = useQuery({
    queryKey: ["schedule-reminder-people", companyId],
    enabled: Boolean(companyId) && canAssignReminders,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("company_id", companyId!)
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>;
    },
  });

  const peopleById = useMemo(() => {
    const map = new Map<string, { first_name: string | null; last_name: string | null }>();
    for (const person of peopleQuery.data ?? []) map.set(person.id, person);
    return map;
  }, [peopleQuery.data]);

  const visibleAssigned = useMemo(() => {
    const rows = assignedQuery.data ?? [];
    if (canAssignReminders) return rows;
    return rows.filter((row) => row.user_id === profileId);
  }, [assignedQuery.data, canAssignReminders, profileId]);

  const addPersonal = () => {
    const title = personalTitle.trim();
    if (!title) return;
    personal.addReminder({
      title,
      message: "Personal reminder. This does not change anyone else's reminders.",
      day: personalDay,
      time: personalTime,
    });
    setPersonalTitle("");
  };

  const addTeamReminder = async () => {
    const title = teamTitle.trim();
    const targetId = teamTarget === "me" ? profileId : teamTarget;
    if (!title || !targetId) return;
    setSavingTeam(true);
    try {
      await createScheduleAssignmentReminder({
        userId: targetId,
        title,
        message: teamMessage.trim() || title,
        day: teamDay,
        time: teamTime,
      });
      setTeamTitle("");
      setTeamMessage("");
      await queryClient.invalidateQueries({
        queryKey: ["schedule-assignment-reminders", companyId],
      });
      toast({
        title: "Reminder assigned",
        description:
          targetId === profileId
            ? "This reminder is for you. Staff cannot change reminders you assign."
            : "The employee can see it, and cannot edit or remove it.",
      });
    } catch {
      toast({
        title: "Could not assign the reminder",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingTeam(false);
    }
  };

  const removeTeamReminder = async (id: string) => {
    try {
      await deleteScheduleAssignmentReminder(id);
      await queryClient.invalidateQueries({
        queryKey: ["schedule-assignment-reminders", companyId],
      });
    } catch {
      toast({
        title: "Could not remove the reminder",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Your reminders
          </CardTitle>
          <CardDescription>
            These stay with you. Turning one off does not change a reminder a
            manager assigned.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {personal.reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div>
                <p className="text-sm font-medium">{reminder.title}</p>
                <p className="text-xs text-muted-foreground">
                  {weekdayLabel(reminder.day)} at {reminder.time}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={reminder.enabled}
                  onCheckedChange={(checked) =>
                    personal.toggleReminder(reminder.id, checked)
                  }
                  aria-label={`Toggle ${reminder.title}`}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Remove ${reminder.title}`}
                  onClick={() => personal.removeReminder(reminder.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="grid gap-2 sm:grid-cols-[1fr_9rem_7rem_auto]">
            <div className="space-y-1">
              <Label htmlFor="personal-reminder-title">New reminder</Label>
              <Input
                id="personal-reminder-title"
                value={personalTitle}
                onChange={(event) => setPersonalTitle(event.target.value)}
                placeholder="Check the board"
              />
            </div>
            <div className="space-y-1">
              <Label>Day</Label>
              <Select value={personalDay} onValueChange={setPersonalDay}>
                <SelectTrigger aria-label="Personal reminder day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {weekdayLabel(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="personal-reminder-time">Time</Label>
              <Input
                id="personal-reminder-time"
                type="time"
                value={personalTime}
                onChange={(event) => setPersonalTime(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={addPersonal} disabled={!personalTitle.trim()}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canAssignReminders ? "Reminders you assign" : "Assigned to you"}
          </CardTitle>
          <CardDescription>
            {canAssignReminders
              ? "Assign one to yourself or to an employee. They can read it. They cannot edit it or turn it off."
              : "A manager or owner set these. You can add your own reminder above, and you cannot change these."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedQuery.isError ? (
            <Alert>
              <AlertDescription>
                Assigned reminders could not be loaded. Your personal reminders
                above are still saved on this device.
              </AlertDescription>
            </Alert>
          ) : null}

          {visibleAssigned.length === 0 && !assignedQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {canAssignReminders
                ? "No assigned reminders yet."
                : "Nothing has been assigned to you."}
            </p>
          ) : null}

          {visibleAssigned.map((reminder) => {
            const when = reminder.remind_at
              ? format(new Date(reminder.remind_at), "EEE p")
              : weekdayLabel(reminder.repeat_interval ?? "weekly");
            const target = reminder.user_id
              ? personName(peopleById.get(reminder.user_id))
              : "Team";
            return (
              <div
                key={reminder.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{reminder.title || "Reminder"}</p>
                  {reminder.description ? (
                    <p className="text-xs text-muted-foreground">{reminder.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {canAssignReminders ? `${target} · ` : ""}
                    {when}
                  </p>
                </div>
                {canAssignReminders ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Remove ${reminder.title || "reminder"}`}
                    onClick={() => removeTeamReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            );
          })}

          {canAssignReminders ? (
            <div className="grid gap-2 border-t pt-3">
              <div className="space-y-1">
                <Label htmlFor="team-reminder-title">Reminder</Label>
                <Input
                  id="team-reminder-title"
                  value={teamTitle}
                  onChange={(event) => setTeamTitle(event.target.value)}
                  placeholder="Update availability"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-reminder-message">Note</Label>
                <Input
                  id="team-reminder-message"
                  value={teamMessage}
                  onChange={(event) => setTeamMessage(event.target.value)}
                  placeholder="Send hours before Thursday night"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Who</Label>
                  <Select value={teamTarget} onValueChange={setTeamTarget}>
                    <SelectTrigger aria-label="Reminder recipient">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">Me</SelectItem>
                      {(peopleQuery.data ?? [])
                        .filter((person) => person.id !== profileId)
                        .map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {personName(person)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Day</Label>
                  <Select value={teamDay} onValueChange={setTeamDay}>
                    <SelectTrigger aria-label="Assigned reminder day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {weekdayLabel(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-reminder-time">Time</Label>
                  <Input
                    id="team-reminder-time"
                    type="time"
                    value={teamTime}
                    onChange={(event) => setTeamTime(event.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-fit"
                onClick={addTeamReminder}
                disabled={savingTeam || !teamTitle.trim() || !profileId}
              >
                {savingTeam ? "Assigning..." : "Assign reminder"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
