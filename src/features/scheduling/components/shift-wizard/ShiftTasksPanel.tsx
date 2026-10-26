import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ShiftFormPicker } from "./ShiftFormPicker";

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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

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

  const saveTask = async (draft: {
    title: string;
    description: string;
    priority: ShiftTaskPriority;
    estimatedMinutes: number;
    formId: string | null;
    assigneeIds: string[];
    startsAt: string | null;
    endsAt: string | null;
  }) => {
    if (!draft.title.trim()) {
      toast({ title: t("tasks.aTitleIsRequired"), variant: "destructive" });
      return false;
    }
    if (
      (draft.startsAt || draft.endsAt) &&
      (!draft.startsAt || !draft.endsAt || draft.endsAt < draft.startsAt)
    ) {
      toast({ title: t("tasks.endMustBeAfterStart"), variant: "destructive" });
      return false;
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
      return true;
    }
    if (!companyId || !user?.id) return false;
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
      toast({
        title: draft.formId ? t("tasks.formLinkedToShift") : t("tasks.shiftTaskAdded"),
      });
      return true;
    } catch (error) {
      toast({
        title: t("tasks.shiftTaskNotSaved"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addSimpleTask = async () => {
    const saved = await saveTask({
      title: title.trim(),
      description,
      priority: "medium",
      estimatedMinutes: 0,
      formId: null,
      assigneeIds,
      startsAt: fromDatetimeLocalValue(startsAt),
      endsAt: fromDatetimeLocalValue(endsAt),
    });
    if (!saved) return;
    setTitle("");
    setDescription("");
    setAssigneeIds([]);
    setStartsAt("");
    setEndsAt("");
  };

  const linkForm = async (form: { id: string; title: string | null }) => {
    await saveTask({
      title: form.title?.trim() || t("forms.publishedForm"),
      description: "",
      priority: "medium",
      estimatedMinutes: 0,
      formId: form.id,
      assigneeIds: [],
      startsAt: null,
      endsAt: null,
    });
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
                      {t("tasks.fillAndSend")}
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
        <Button type="button" className="min-h-11" disabled={saving} onClick={() => void addSimpleTask()}>
          {t("tasks.addShiftTask")}
        </Button>
      </div>
      <div className="space-y-2 border-t pt-3" data-testid="shift-forms-panel">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t("tasks.shiftForms")}</h3>
          <p className="text-sm text-muted-foreground">{t("tasks.shiftFormsHelp")}</p>
        </div>
        <ShiftFormPicker
          disabled={saving}
          linkedIds={tasks.flatMap((task) => (task.formId ? [task.formId] : []))}
          onLink={(form) => void linkForm(form)}
        />
      </div>
    </section>
  );
}
