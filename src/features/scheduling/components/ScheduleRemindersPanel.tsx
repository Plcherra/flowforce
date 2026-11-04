import { useTranslation } from "react-i18next";
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
import { useCan } from "@/hooks/useCan";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { usePersonalScheduleReminders } from "@/features/scheduling/hooks/usePersonalScheduleReminders";
import { Link } from "@/lib/router-adapter";
import { LinkedRecordReminders } from "@/features/scheduling/components/LinkedRecordReminders";
import { PersonalReminderAttachField } from "@/features/scheduling/components/PersonalReminderAttachField";
import {
  linkedRecordHref,
  type LinkedRecordKind,
} from "@/features/scheduling/utils/linkedScheduleReminder";
import { AssignFormReminderForm } from "@/features/scheduling/components/AssignFormReminderForm";
import { AssignedReminderControls } from "@/features/scheduling/components/AssignedReminderControls";
import {
  clockLabel,
  repeatLabel,
} from "@/features/scheduling/utils/reminderRepeat";
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

function weekdayLabel(day: string, labels: Record<string, string>) {
  return labels[day] ?? day;
}

function personName(
  person?: { first_name?: string | null; last_name?: string | null },
  fallback = "Team member",
) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim();
  return name || fallback;
}

interface ScheduleRemindersPanelProps {
  canAssignReminders: boolean;
}

export function ScheduleRemindersPanel({
  canAssignReminders,
}: ScheduleRemindersPanelProps) {
  const { t } = useTranslation();
  const dayLabels: Record<string, string> = {
    monday: t("schedule.dayMonday"),
    tuesday: t("schedule.dayTuesday"),
    wednesday: t("schedule.dayWednesday"),
    thursday: t("schedule.dayThursday"),
    friday: t("schedule.dayFriday"),
    saturday: t("schedule.daySaturday"),
    sunday: t("schedule.daySunday"),
  };
  const repeatLabels = {
    daily: t("schedule.repeatDaily"),
    weekly: t("schedule.repeatWeekly"),
    weekdays: t("schedule.repeatWeekdays"),
    once: t("schedule.repeatOnce"),
  };
  const memberLabel = t("schedule.teamMember");
  const { toast } = useToast();
  const { profile } = useProfile();
  const profileId = profile?.id ?? null;
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { can } = useCan();
  const canAssignToSomeoneElse = can("schedule.reminders.assign");
  const canGrantDeactivate = can("schedule.reminders.grant_deactivate");
  const personal = usePersonalScheduleReminders(profileId);
  const queryClient = useQueryClient();

  const [personalTitle, setPersonalTitle] = useState("");
  const [personalDay, setPersonalDay] = useState<string>("sunday");
  const [personalTime, setPersonalTime] = useState("18:00");
  const [personalKind, setPersonalKind] = useState<LinkedRecordKind | "">("");
  const [personalRecordId, setPersonalRecordId] = useState("");

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
    enabled: Boolean(companyId) && (canAssignReminders || canAssignToSomeoneElse),
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
    const scoped = canAssignReminders
      ? rows
      : rows.filter((row) => row.user_id === profileId);
    if (canAssignReminders) return scoped;
    return scoped.filter((row) => row.completed !== true);
  }, [assignedQuery.data, canAssignReminders, profileId]);

  const addPersonal = () => {
    const title = personalTitle.trim();
    if (!title) return;
    personal.addReminder({
      title,
      message: t("schedule.personalReminderNote"),
      day: personalDay,
      time: personalTime,
      recordKind: personalKind || undefined,
      recordId: personalKind && personalRecordId ? personalRecordId : undefined,
    });
    setPersonalTitle("");
    setPersonalKind("");
    setPersonalRecordId("");
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
        title: t("schedule.reminderAssigned"),
        description:
          targetId === profileId
            ? t("schedule.reminderAssignedSelf")
            : t("schedule.reminderAssignedOther"),
      });
    } catch {
      toast({
        title: t("schedule.couldNotAssignReminder"),
        description: t("schedule.pleaseTryAgainInAFewMoments"),
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
        title: t("schedule.couldNotRemoveReminder"),
        description: t("schedule.pleaseTryAgainInAFewMoments"),
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
            {t("schedule.yourReminders")}
          </CardTitle>
          <CardDescription>
            {t("schedule.theseStayWithYouTurningOneOffDoes")}
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
                  {t("schedule.reminderAt", {
                    day: weekdayLabel(reminder.day, dayLabels),
                    time: reminder.time,
                  })}
                </p>
                {reminder.recordKind && reminder.recordId ? (
                  <Link
                    to={linkedRecordHref(reminder.recordKind, reminder.recordId)}
                    data-testid={`open-personal-reminder-${reminder.id}`}
                    className="text-xs font-medium text-primary"
                  >
                    {t("schedule.openRecord", { kind: reminder.recordKind })}
                  </Link>
                ) : null}
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
              <Label htmlFor="personal-reminder-title">{t("schedule.newReminder")}</Label>
              <Input
                id="personal-reminder-title"
                value={personalTitle}
                onChange={(event) => setPersonalTitle(event.target.value)}
                placeholder={t("schedule.checkTheBoard")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("schedule.day")}</Label>
              <Select value={personalDay} onValueChange={setPersonalDay}>
                <SelectTrigger aria-label={t("schedule.personalReminderDay")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day} value={day}>
                      {weekdayLabel(day, dayLabels)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="personal-reminder-time">{t("schedule.time")}</Label>
              <Input
                id="personal-reminder-time"
                type="time"
                value={personalTime}
                onChange={(event) => setPersonalTime(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                onClick={addPersonal}
                disabled={!personalTitle.trim() || (Boolean(personalKind) && !personalRecordId)}
              >
                {t("schedule.add")}
              </Button>
            </div>
          </div>
          <PersonalReminderAttachField
            companyId={companyId}
            kind={personalKind}
            recordId={personalRecordId}
            onKindChange={setPersonalKind}
            onRecordChange={setPersonalRecordId}
          />
        </CardContent>
      </Card>

      <LinkedRecordReminders
        userId={profileId}
        personalReminders={personal.reminders}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canAssignReminders
              ? t("schedule.remindersYouAssign")
              : t("schedule.assignedToYouTitle")}
          </CardTitle>
          <CardDescription>
            {canAssignReminders
              ? t("schedule.assignReminderHelp")
              : t("schedule.assignedReminderReadOnlyHelp")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedQuery.isError ? (
            <Alert>
              <AlertDescription>
                {t("schedule.assignedRemindersCouldNotBeLoadedYourPersonal")}
              </AlertDescription>
            </Alert>
          ) : null}

          {visibleAssigned.length === 0 && !assignedQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {canAssignReminders
                ? t("schedule.noAssignedRemindersYet")
                : t("schedule.nothingAssignedToYou")}
            </p>
          ) : null}

          {visibleAssigned.map((reminder) => {
            const when = reminder.remind_at
              ? format(new Date(reminder.remind_at), "EEE p")
              : weekdayLabel(reminder.repeat_interval ?? "weekly", dayLabels);
            const target = reminder.user_id
              ? personName(peopleById.get(reminder.user_id), memberLabel)
              : t("schedule.teamWord");
            return (
              <div
                key={reminder.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
                data-testid="assigned-reminder"
              >
                <div>
                  <p className="text-sm font-medium">
                    {reminder.title || t("schedule.reminder")}
                  </p>
                  {reminder.description ? (
                    <p className="text-xs text-muted-foreground">{reminder.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {canAssignReminders ? `${target} · ` : ""}
                    {when}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="assigned-reminder-time">
                    {clockLabel(reminder.remind_at)}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="assigned-reminder-repeat">
                    {repeatLabel(reminder.repeat_interval, repeatLabels)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AssignedReminderControls
                    companyId={companyId}
                    reminderId={reminder.id}
                    title={reminder.title || t("schedule.reminder")}
                    allowDeactivate={reminder.allow_deactivate === true}
                    isAssignee={reminder.user_id === profileId}
                    canGrantDeactivate={canGrantDeactivate}
                  />
                  {canAssignReminders ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={t("schedule.removeReminder", {
                      title: reminder.title || t("schedule.reminderWord"),
                    })}
                    onClick={() => removeTeamReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
                </div>
              </div>
            );
          })}

          {canAssignReminders ? (
            <div className="grid gap-2 border-t pt-3">
              <div className="space-y-1">
                <Label htmlFor="team-reminder-title">{t("schedule.reminder")}</Label>
                <Input
                  id="team-reminder-title"
                  value={teamTitle}
                  onChange={(event) => setTeamTitle(event.target.value)}
                  placeholder={t("schedule.updateAvailability")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="team-reminder-message">{t("schedule.note")}</Label>
                <Input
                  id="team-reminder-message"
                  value={teamMessage}
                  onChange={(event) => setTeamMessage(event.target.value)}
                  placeholder={t("schedule.sendHoursBeforeThursdayNight")}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>{t("schedule.who")}</Label>
                  <Select value={teamTarget} onValueChange={setTeamTarget}>
                    <SelectTrigger aria-label={t("schedule.reminderRecipient")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">{t("schedule.me")}</SelectItem>
                      {(peopleQuery.data ?? [])
                        .filter((person) => person.id !== profileId)
                        .map((person) => (
                          <SelectItem key={person.id} value={person.id}>
                            {personName(person, memberLabel)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("schedule.day")}</Label>
                  <Select value={teamDay} onValueChange={setTeamDay}>
                    <SelectTrigger aria-label={t("schedule.assignedReminderDay")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {weekdayLabel(day, dayLabels)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-reminder-time">{t("schedule.time")}</Label>
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
                {savingTeam ? t("schedule.assigning") : t("schedule.assignReminder")}
              </Button>
            </div>
          ) : null}
          {canAssignToSomeoneElse && companyId ? (
            <AssignFormReminderForm
              companyId={companyId}
              people={peopleQuery.data ?? []}
              profileId={profileId}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
