import { useCallback, useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import type { CopilotActionPayload } from "@/server/copilot/CopilotDTO";
import { logger } from "@/utils/logger";

type TaskStatus = "pending" | "done" | "missed";

type ChecklistRow = {
  id: string;
  name: string;
  recurrence: string;
  default_tasks: unknown;
};

type TaskRow = {
  id: string;
  checklistid: string;
  assigned_to: string | null;
  store_id: string | null;
  day: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
};

type ShiftRow = {
  employee_id: string | null;
  role: string | null;
  store_id: string | null;
};

type EmployeeRow = {
  id: string;
  name: string | null;
  display_name: string | null;
};

type DefaultTask = {
  title: string;
  role?: string | null;
};

type SupervisorInfo = {
  employeeId: string;
  employeeName: string | null;
};

export interface ChecklistTask {
  id: string;
  checklistId: string;
  checklistName: string;
  title: string;
  status: TaskStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  storeId: string | null;
  day: string;
}

interface ChecklistState {
  loading: boolean;
  error: string | null;
  tasks: ChecklistTask[];
  supervisorsOnDuty: SupervisorInfo[];
}

const INITIAL_STATE: ChecklistState = {
  loading: false,
  error: null,
  tasks: [],
  supervisorsOnDuty: [],
};

type PlannedTaskCreation = {
  fingerprint: string;
  payload: {
    checklistid: string;
    company_id: string;
    store_id: string | null;
    day: string;
    status: TaskStatus;
    assigned_to: string | null;
    metadata: Record<string, unknown>;
  };
  checklistName: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string | null;
};

type PlannedAssignmentUpdate = {
  id: string;
  assigned_to: string;
  checklistId: string;
  title: string;
  assigneeName: string | null;
};

type AssignmentEvent =
  | {
      type: "created";
      fingerprint: string;
      checklistId: string;
      title: string;
      assigneeId: string;
      assigneeName: string | null;
    }
  | {
      type: "updated";
      taskId: string;
      checklistId: string;
      title: string;
      assigneeId: string;
      assigneeName: string | null;
    };

export interface ChecklistPlanInput {
  day: string;
  storeId: string | null;
  checklists: ChecklistRow[];
  existingTasks: TaskRow[];
  supervisors: SupervisorInfo[];
  employeeNames: Map<string, string>;
  companyId: string;
}

export interface ChecklistPlanResult {
  creations: PlannedTaskCreation[];
  updates: PlannedAssignmentUpdate[];
  assignmentEvents: AssignmentEvent[];
}

const NORMALISE = (value: string) => value.trim().toLowerCase();
const buildFingerprint = (checklistId: string, title: string) =>
  `${checklistId}::${NORMALISE(title)}`;

const parseDefaultTasks = (value: unknown): DefaultTask[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry): DefaultTask | null => {
        if (!entry || typeof entry !== "object") return null;
        const title = (entry as { title?: string }).title;
        if (typeof title !== "string" || title.trim().length === 0) return null;
        const role = (entry as { role?: string }).role ?? "supervisor";
        return { title, role } satisfies DefaultTask;
      })
      .filter((entry): entry is DefaultTask => Boolean(entry));
  }
  return [];
};

const isSupervisorRole = (value: string | null | undefined) =>
  (value ?? "").toLowerCase() === "supervisor";

const mapTaskRowToChecklistTask = (
  row: TaskRow,
  checklistName: string,
  employeeNames: Map<string, string>,
): ChecklistTask => ({
  id: row.id,
  checklistId: row.checklistid,
  checklistName,
  title:
    (row.metadata as { defaultTitle?: string } | null)?.defaultTitle ??
    (row.metadata as { title?: string } | null)?.title ??
    "Task",
  status: (row.status as TaskStatus) ?? "pending",
  assignedTo: row.assigned_to,
  assigneeName: row.assigned_to
    ? (employeeNames.get(row.assigned_to) ?? null)
    : null,
  storeId: row.store_id,
  day: row.day,
});

export function generateChecklistPlan({
  day,
  storeId,
  checklists,
  existingTasks,
  supervisors,
  companyId,
}: ChecklistPlanInput): ChecklistPlanResult {
  const creations: PlannedTaskCreation[] = [];
  const updates: PlannedAssignmentUpdate[] = [];
  const assignmentEvents: AssignmentEvent[] = [];

  const checklistIndex = new Map<string, ChecklistRow>();
  checklists.forEach((checklist) => {
    checklistIndex.set(checklist.id, checklist);
  });

  const supervisorQueue = supervisors.slice();
  let supervisorIndex = 0;

  const nextSupervisor = () => {
    if (supervisorQueue.length === 0) return null;
    const supervisor =
      supervisorQueue[supervisorIndex % supervisorQueue.length];
    supervisorIndex += 1;
    return supervisor;
  };

  const existingTaskMap = new Map<string, TaskRow>();
  const fingerprintsByTaskId = new Map<string, string>();

  existingTasks.forEach((task) => {
    const checklist = checklistIndex.get(task.checklistid);
    if (!checklist) return;
    const defaultTitle = (task.metadata as { defaultTitle?: string } | null)
      ?.defaultTitle;
    const fingerprint = defaultTitle
      ? buildFingerprint(task.checklistid, defaultTitle)
      : buildFingerprint(task.checklistid, task.id);
    fingerprintsByTaskId.set(task.id, fingerprint);
    if (!existingTaskMap.has(fingerprint)) {
      existingTaskMap.set(fingerprint, task);
    }
  });

  // Ensure existing tasks without assignment are paired with supervisors
  existingTasks.forEach((task) => {
    if (!task.id || task.assigned_to) return;
    const checklist = checklistIndex.get(task.checklistid);
    if (!checklist) return;
    const defaultTasks = parseDefaultTasks(checklist.default_tasks);
    const defaultTitle =
      (task.metadata as { defaultTitle?: string } | null)?.defaultTitle ??
      defaultTasks[0]?.title ??
      "Task";
    const fingerprint = buildFingerprint(task.checklistid, defaultTitle);
    fingerprintsByTaskId.set(task.id, fingerprint);

    const supervisor = nextSupervisor();
    if (!supervisor) return;

    updates.push({
      id: task.id,
      assigned_to: supervisor.employeeId,
      checklistId: task.checklistid,
      title: defaultTitle,
      assigneeName: supervisor.employeeName,
    });

    assignmentEvents.push({
      type: "updated",
      taskId: task.id,
      checklistId: task.checklistid,
      title: defaultTitle,
      assigneeId: supervisor.employeeId,
      assigneeName: supervisor.employeeName,
    });
  });

  checklists.forEach((checklist) => {
    if (checklist.recurrence !== "daily") return;
    const defaults = parseDefaultTasks(checklist.default_tasks);
    defaults.forEach((defaultTask) => {
      const fingerprint = buildFingerprint(checklist.id, defaultTask.title);
      if (existingTaskMap.has(fingerprint)) return;
      const supervisor = isSupervisorRole(defaultTask.role ?? "supervisor")
        ? nextSupervisor()
        : null;

      const metadata = {
        source: "copilot",
        defaultTitle: defaultTask.title,
        defaultRole: defaultTask.role ?? "supervisor",
        fingerprint,
      } satisfies Record<string, unknown>;

      creations.push({
        fingerprint,
        checklistName: checklist.name,
        title: defaultTask.title,
        assigneeId: supervisor?.employeeId ?? null,
        assigneeName: supervisor?.employeeName ?? null,
        payload: {
          checklistid: checklist.id,
          company_id: companyId,
          store_id: storeId,
          day,
          status: "pending",
          assigned_to: supervisor?.employeeId ?? null,
          metadata,
        },
      });

      if (supervisor?.employeeId) {
        assignmentEvents.push({
          type: "created",
          fingerprint,
          checklistId: checklist.id,
          title: defaultTask.title,
          assigneeId: supervisor.employeeId,
          assigneeName: supervisor.employeeName,
        });
      }
    });
  });

  return {
    creations,
    updates,
    assignmentEvents,
  };
}

export function useCopilotChecklist(date: Date, storeId: string | null) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [state, setState] = useState<ChecklistState>(INITIAL_STATE);

  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const actorUserId = profile?.id ?? null;

  const targetDay = useMemo(() => {
    const iso = date.toISOString();
    return iso.split("T")[0] ?? iso;
  }, [date]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const checklistsQuery = supabase
        .from("operations_checklists")
        .select("id, name, recurrence, default_tasks")
        .eq("company_id", companyId);

      const tasksQuery = supabase
        .from("operations_tasks")
        .select(
          "id, checklistid, assigned_to, store_id, day, status, metadata",
        )
        .eq("company_id", companyId)
        .eq("day", targetDay);

      if (storeId) {
        tasksQuery.eq("store_id", storeId);
      }

      const shiftsQuery = supabase
        .from("schedule_shifts")
        .select("employee_id, role, store_id, day")
        .eq("company_id", companyId)
        .eq("day", targetDay);

      if (storeId) {
        shiftsQuery.eq("store_id", storeId);
      }

      const employeesQuery = supabase
        .from("employees")
        .select("id, name, display_name")
        .eq("company_id", companyId)
        .eq("active", true);

      const [checklistsRes, tasksRes, shiftsRes, employeesRes] =
        await Promise.all([
          checklistsQuery,
          tasksQuery,
          shiftsQuery,
          employeesQuery,
        ]);

      const responses = [
        { label: "operations_checklists", response: checklistsRes },
        { label: "operations_tasks", response: tasksRes },
        { label: "schedule_shifts", response: shiftsRes },
        { label: "employees", response: employeesRes },
      ];

      const failed = responses.filter(({ response }) => response.error);
      if (failed.length > 0) {
        failed.forEach(({ label, response }) => {
          logger.error("[useCopilotChecklist] Query failed", {
            context: { label },
            error: response.error,
            tags: ["error"],
          });
        });
        throw failed[0].response.error as PostgrestError;
      }

      const checklists = (checklistsRes.data ?? []) as ChecklistRow[];
      const rawTasks = (tasksRes.data ?? []) as TaskRow[];
      const shifts = (shiftsRes.data ?? []) as ShiftRow[];
      const employees = (employeesRes.data ?? []) as EmployeeRow[];

      const employeeNames = new Map<string, string>();
      employees.forEach((employee) => {
        const label =
          employee.name ??
          employee.display_name ??
          `Employee ${employee.id.slice(0, 6)}`;
        employeeNames.set(employee.id, label);
      });

      const supervisors = shifts
        .filter(
          (shift) => Boolean(shift.employee_id) && isSupervisorRole(shift.role),
        )
        .map((shift) => ({
          employeeId: shift.employee_id as string,
          employeeName: employeeNames.get(shift.employee_id as string) ?? null,
        }));

      const plan = generateChecklistPlan({
        day: targetDay,
        storeId,
        checklists,
        existingTasks: rawTasks,
        supervisors,
        employeeNames,
        companyId,
      });

      let insertedRows: TaskRow[] = [];
      if (plan.creations.length > 0) {
        const { data, error } = await supabase
          .from("operations_tasks")
          .insert(plan.creations.map((item) => item.payload))
          .select(
            "id, checklistid, assigned_to, store_id, day, status, metadata",
          );
        if (error) throw error;
        insertedRows = (data ?? []) as TaskRow[];
      }

      if (plan.updates.length > 0) {
        const { error } = await supabase.from("operations_tasks").upsert(
          plan.updates.map(({ id, assigned_to }) => ({ id, assigned_to })),
          { onConflict: "id" },
        );
        if (error) throw error;
      }

      const insertedByFingerprint = new Map<string, TaskRow>();
      insertedRows.forEach((row) => {
        const fingerprint = (row.metadata as { fingerprint?: string } | null)
          ?.fingerprint;
        if (fingerprint) {
          insertedByFingerprint.set(fingerprint, row);
        }
      });

      const actions: CopilotActionPayload[] = [];
      if (plan.assignmentEvents.length > 0 && companyId && actorUserId) {
        plan.assignmentEvents.forEach((event) => {
          let taskId: string | null = null;
          if (event.type === "updated") {
            taskId = event.taskId;
          } else {
            const matched = insertedByFingerprint.get(event.fingerprint);
            taskId = matched?.id ?? null;
          }
          if (!taskId) return;
          actions.push({
            companyId,
            actorUserId,
            source: "scheduler",
            dedupeKey: `task_auto_assign::${taskId}`,
            actionType: "task_auto_assign",
            status: "queued",
            payload: {
              type: "task_auto_assign",
              taskId,
              checklistId: event.checklistId,
              taskTitle: event.title,
              assignee: event.assigneeId,
            },
            evaluation: {
              reason:
                "Auto-assigned checklist task based on supervisor coverage.",
            },
            metadata: {
              storeId,
              day: targetDay,
            },
            notes: [
              `Assigned ${event.title} to ${event.assigneeName ?? event.assigneeId}`,
            ],
            impacts: [],
            confidence: 0.6,
            queuedAt: new Date().toISOString(),
          });
        });
      }

      if (actions.length > 0) {
        const { error } = await supabase.functions.invoke("copilot-service", {
          body: {
            companyId,
            actorUserId,
            source: "scheduler",
            timeframe: {
              start: `${targetDay}T00:00:00Z`,
              end: `${targetDay}T23:59:59Z`,
            },
            mode: "enqueue",
            actions,
          },
        });
        if (error) {
          logger.warn(
            "[useCopilotChecklist] Failed to enqueue Copilot actions",
            { error, tags: ["warning"] },
          );
        }
      }

      const checklistNames = new Map<string, string>();
      checklists.forEach((checklist) => {
        checklistNames.set(checklist.id, checklist.name);
      });

      const updatedTaskIds = new Map<string, string>();
      plan.updates.forEach((update) => {
        updatedTaskIds.set(update.id, update.assigned_to);
      });

      const baseTasks: ChecklistTask[] = rawTasks.map((task) => {
        const checklistName =
          checklistNames.get(task.checklistid) ?? "Checklist";
        if (updatedTaskIds.has(task.id)) {
          const assignedTo = updatedTaskIds.get(task.id) ?? null;
          return {
            ...mapTaskRowToChecklistTask(task, checklistName, employeeNames),
            assignedTo,
            assigneeName: assignedTo
              ? (employeeNames.get(assignedTo) ?? null)
              : null,
          };
        }
        return mapTaskRowToChecklistTask(task, checklistName, employeeNames);
      });

      const insertedTasks: ChecklistTask[] = insertedRows.map((row) => {
        const checklistName =
          checklistNames.get(row.checklistid) ?? "Checklist";
        return mapTaskRowToChecklistTask(row, checklistName, employeeNames);
      });

      setState({
        loading: false,
        error: null,
        tasks: [...baseTasks, ...insertedTasks].sort((a, b) =>
          a.title.localeCompare(b.title),
        ),
        supervisorsOnDuty: supervisors,
      });
    } catch (error) {
      const message =
        (error as PostgrestError)?.message ??
        (error instanceof Error ? error.message : "Failed to load checklist");
      setState({ ...INITIAL_STATE, error: message });
      toast({
        title: "Checklist sync failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [actorUserId, companyId, storeId, targetDay, toast]);

  useEffect(() => {
    if (!companyId) return;
    refresh();
  }, [companyId, refresh]);

  const completeTask = useCallback(
    async (taskId: string, status: TaskStatus) => {
      if (!companyId) return;
      const { error } = await supabase
        .from("operations_tasks")
        .update({ status })
        .eq("company_id", companyId)
        .eq("id", taskId);

      if (error) {
        toast({
          title: "Update failed",
          description: error.message ?? "Unable to update task status.",
          variant: "destructive",
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task,
        ),
      }));
    },
    [companyId, toast],
  );

  return {
    loading: state.loading,
    error: state.error,
    tasks: state.tasks,
    supervisorsOnDuty: state.supervisorsOnDuty,
    completeTask,
    refresh,
  };
}
