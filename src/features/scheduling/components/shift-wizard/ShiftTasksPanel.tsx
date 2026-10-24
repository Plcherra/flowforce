import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PeoplePicker } from "@/components/people/PeoplePicker";
import type { PickerPerson } from "@/components/people/peoplePickerFilter";
import { useEmployees } from "@/features/employees/hooks/useEmployees";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { deleteTaskRow, insertTask } from "@/features/tasks/repositories/tasksRepository";
import {
  readAssigneeIds,
  readFormId,
  shiftTaskRow,
  type ShiftTaskPriority,
} from "@/features/tasks/utils/shiftTaskWrite";
import {
  fromDatetimeLocalValue,
  readTaskSchedule,
  toDatetimeLocalValue,
} from "@/features/tasks/utils/taskSchedule";
import type { Json } from "@/integrations/supabase/public-types";
import type { ShiftTask } from "./types";

type SavedTask = ShiftTask & {
  formId: string | null;
  assigneeIds: string[];
  startsAt: string | null;
  endsAt: string | null;
};

function toSavedTask(row: {
  id: string;
  title: string | null;
  description: string | null;
  priority: string | null;
  estimated_hours: number | string | null;
  assigned_to: string | null;
  links: unknown;
}): SavedTask {
  const priority: ShiftTaskPriority =
    row.priority === "low" || row.priority === "high" ? row.priority : "medium";
  const hours = typeof row.estimated_hours === "number"
    ? row.estimated_hours
    : Number(row.estimated_hours ?? 0);
  const schedule = readTaskSchedule(row.links);
  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    priority,
    estimated_minutes: Math.max(0, Math.round((Number.isFinite(hours) ? hours : 0) * 60)),
    formId: readFormId(row.links),
    assigneeIds: readAssigneeIds(row.links, row.assigned_to),
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
  };
}

export function ShiftTasksPanel({
  scheduleId,
  shiftTitle,
  shiftEndIso,
  drafts = [],
  onDraftsChange,
}: {
  scheduleId?: string | null;
  shiftTitle: string;
  shiftEndIso?: string | null;
  drafts?: ShiftTask[];
  onDraftsChange?: (tasks: ShiftTask[]) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { employees, getEmployeeFullName } = useEmployees({ companyId, enabled: Boolean(companyId) });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ShiftTaskPriority>("medium");
  const [minutes, setMinutes] = useState("30");
  const [formId, setFormId] = useState("none");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  const formsQuery = useQuery({
    queryKey: ["shift-task-forms", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("id, title, status")
        .eq("company_id", companyId!)
        .eq("status", "published")
        .order("title", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["shift-task-attachments", companyId, scheduleId],
    enabled: Boolean(companyId && scheduleId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, priority, estimated_hours, assigned_to, links")
        .eq("company_id", companyId!)
        .eq("source", "schedule")
        .filter("links->>schedule_id", "eq", scheduleId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toSavedTask);
    },
  });

  const people = useMemo<PickerPerson[]>(
    () =>
      employees.map((person) => ({
        id: person.id,
        name: getEmployeeFullName(person),
        role: person.position?.name ?? null,
        level: person.role ?? null,
      })),
    [employees, getEmployeeFullName],
  );

  const tasks = scheduleId ? (tasksQuery.data ?? []) : drafts.map((task) => ({
    ...task,
    formId: task.formId ?? null,
    assigneeIds: task.assigneeIds ?? [],
    startsAt: task.startsAt ?? null,
    endsAt: task.endsAt ?? null,
  }));

  const addTask = async () => {
    const chosenForm = (formsQuery.data ?? []).find((form) => form.id === formId);
    const nextTitle = title.trim() || chosenForm?.title || "";
    if (!nextTitle) {
      toast({ title: t("tasks.aTitleIsRequired"), variant: "destructive" });
      return;
    }
    const draft = {
      title: nextTitle,
      description,
      priority,
      estimatedMinutes: Number(minutes) || 0,
      formId: formId === "none" ? null : formId,
      assigneeIds,
      startsAt: fromDatetimeLocalValue(startsAt),
      endsAt: fromDatetimeLocalValue(endsAt),
    };
    if ((startsAt || endsAt) && (!draft.startsAt || !draft.endsAt || draft.endsAt < draft.startsAt)) {
      toast({ title: t("tasks.endMustBeAfterStart"), variant: "destructive" });
      return;
    }
    if (!scheduleId) {
      onDraftsChange?.([
        ...drafts,
        {
          id: `draft-${drafts.length + 1}`,
          title: draft.title,
          description: draft.description,
          priority: draft.priority,
          estimated_minutes: draft.estimatedMinutes,
          formId: draft.formId,
          assigneeIds: draft.assigneeIds,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
        },
      ]);
      setTitle("");
      setDescription("");
      setFormId("none");
      return;
    }
    if (!companyId || !user?.id) return;
    setSaving(true);
    try {
      const row = shiftTaskRow({
        ...draft,
        companyId,
        createdBy: user.id,
        scheduleId,
        shiftTitle: shiftTitle || t("tasks.thisShift"),
        fallbackDue: shiftEndIso,
      });
      await insertTask({ ...row, links: row.links as Json });
      await queryClient.invalidateQueries({
        queryKey: ["shift-task-attachments", companyId, scheduleId],
      });
      setTitle("");
      setDescription("");
      setFormId("none");
      toast({ title: t("tasks.shiftTaskAdded") });
    } catch (error) {
      toast({
        title: t("tasks.shiftTaskNotSaved"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async (taskId: string) => {
    if (!scheduleId) {
      onDraftsChange?.(drafts.filter((task) => task.id !== taskId));
      return;
    }
    if (!companyId) return;
    await deleteTaskRow(taskId, companyId);
    await queryClient.invalidateQueries({
      queryKey: ["shift-task-attachments", companyId, scheduleId],
    });
  };

  return (
    <section className="space-y-3" data-testid="shift-tasks-panel">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{t("tasks.shiftTasks")}</h2>
        <p className="text-sm text-muted-foreground">{t("tasks.shiftTasksHelp")}</p>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noShiftTasks")}</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="rounded-xl border border-border/70 px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("people.selectedCount", { count: task.assigneeIds.length })}
                    {task.startsAt ? ` · ${toDatetimeLocalValue(task.startsAt).replace("T", " ")}` : ""}
                  </p>
                  {task.formId ? (
                    <Link to={`/app/forms?form=${task.formId}`} className="text-xs underline">
                      {t("schedule.openLinkedForm")}
                    </Link>
                  ) : null}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => void removeTask(task.id)}>
                  {t("tasks.remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2">
        <Label>{t("forms.publishedForm")}</Label>
        <Select
          value={formId}
          onValueChange={(value) => {
            setFormId(value);
            const form = (formsQuery.data ?? []).find((item) => item.id === value);
            if (form && !title.trim()) setTitle(form.title ?? "");
          }}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("tasks.customShiftTask")}</SelectItem>
            {(formsQuery.data ?? []).map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label htmlFor="shift-task-name">{t("tasks.taskName")}</Label>
        <Input
          id="shift-task-name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("tasks.shiftTaskExample")}
        />
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("tasks.description")}
          rows={2}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label>{t("tasks.priority")}</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as ShiftTaskPriority)}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("tasks.low")}</SelectItem>
                <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
                <SelectItem value="high">{t("tasks.high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shift-task-minutes">{t("schedule.minutes")}</Label>
            <Input
              id="shift-task-minutes"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shift-task-start">{t("tasks.starts")}</Label>
            <Input
              id="shift-task-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="shift-task-end">{t("tasks.ends")}</Label>
            <Input
              id="shift-task-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
        </div>
        <PeoplePicker people={people} selectedIds={assigneeIds} onChange={setAssigneeIds} />
        <Button type="button" className="min-h-11" disabled={saving} onClick={() => void addTask()}>
          {t("tasks.addShiftTask")}
        </Button>
      </div>
    </section>
  );
}
