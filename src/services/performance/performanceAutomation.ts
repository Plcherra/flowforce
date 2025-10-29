import dayjs from 'dayjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, Json } from '@/integrations/supabase/public-types';
import { determineReviewStatus } from './performanceService';
import type { PerformanceReviewStatus } from './performanceTypes';

type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'first_name' | 'last_name' | 'company_id'>;
type ReviewRow = Pick<Tables<'employee_report'>, 'id' | 'employee_id' | 'date' | 'severity' | 'notes' | 'created_by'>;
type TaskRow = Pick<Tables<'tasks'>, 'id' | 'status' | 'tags'>;
type ReminderRow = Pick<Tables<'reminders'>, 'id' | 'description' | 'completed' | 'task_id'>;

const ACTIVE_TASK_STATUSES: Set<Tables<'tasks'>['status']> = new Set(['todo', 'in_progress', 'review']);

interface ExistingAutomationTask {
  id: string;
  employeeId: string;
  status: Tables<'tasks'>['status'] | null;
}

interface ExistingAutomationReminder {
  id: string;
  employeeId: string;
  completed: boolean;
}

interface ReviewTaskTemplate {
  employeeId: string;
  title: string;
  description: string;
  priority: Tables<'tasks'>['priority'];
  dueInDays: number;
  tags: string[];
  originReviewId: string | null;
  assignTo?: string | null;
}

interface ReviewReminderTemplate {
  employeeId: string;
  title: string;
  description: string;
  remindInDays: number;
  priority: string;
  linkToTask: boolean;
}

interface BuildReviewAutomationPlanOptions {
  employees: ProfileRow[];
  reviews: ReviewRow[];
  existingTasks: ExistingAutomationTask[];
  existingReminders: ExistingAutomationReminder[];
  now?: Date;
}

export interface ReviewAutomationPlan {
  taskTemplates: ReviewTaskTemplate[];
  reminderTemplates: ReviewReminderTemplate[];
  statuses: Record<
    string,
    {
      status: PerformanceReviewStatus;
      latestReviewId: string | null;
    }
  >;
}

export interface SyncCopilotReviewAutomationParams {
  actorId: string;
  companyId: string;
  supabaseClient?: SupabaseClient;
  now?: Date;
}

export interface SyncCopilotReviewAutomationResult {
  createdTasks: { id: string; employeeId: string }[];
  createdReminders: { id: string; employeeId: string }[];
  plan: ReviewAutomationPlan;
}

const EMPLOYEE_TAG_PREFIX = 'employee:';

function buildDisplayName(profile: ProfileRow): string {
  const first = profile.first_name?.trim() ?? '';
  const last = profile.last_name?.trim() ?? '';
  const combined = `${first} ${last}`.trim();
  return combined || 'Team Member';
}

function extractEmployeeIdFromTags(tags: string[] | null | undefined): string | null {
  if (!Array.isArray(tags)) return null;
  const match = tags.find((tag) => typeof tag === 'string' && tag.startsWith(EMPLOYEE_TAG_PREFIX));
  return match ? match.slice(EMPLOYEE_TAG_PREFIX.length) : null;
}

function extractEmployeeIdFromDescription(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/employee:([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

function isTaskActive(status: Tables<'tasks'>['status'] | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_TASK_STATUSES.has(status);
}

function formatLatestReviewSummary(review: ReviewRow | null): string {
  if (!review || !review.date) {
    return 'Latest review: none recorded.';
  }
  const dateLabel = dayjs(review.date).isValid() ? dayjs(review.date).format('MMM D, YYYY') : review.date;
  const scoreLabel =
    typeof review.severity === 'number' && !Number.isNaN(review.severity)
      ? `Score ${review.severity}/5`
      : 'Score unavailable';
  return `Latest review ${dateLabel} · ${scoreLabel}`;
}

function buildTaskTemplate(
  employee: ProfileRow,
  status: PerformanceReviewStatus,
  latestReview: ReviewRow | null,
): ReviewTaskTemplate {
  const name = buildDisplayName(employee);
  const isOverdue = status === 'overdue';
  const dueInDays = isOverdue ? 3 : 5;
  const priority: Tables<'tasks'>['priority'] = isOverdue ? 'urgent' : 'high';
  const title = isOverdue
    ? `Schedule performance review for ${name}`
    : `Create coaching plan for ${name}`;
  const descriptionParts = [
    `Co-Pilot detected review status "${status}".`,
    formatLatestReviewSummary(latestReview),
  ];
  if (latestReview?.notes) {
    descriptionParts.push(`Manager notes: ${latestReview.notes}`);
  }
  return {
    employeeId: employee.id,
    title,
    description: descriptionParts.join(' '),
    priority,
    dueInDays,
    tags: ['copilot', 'review', `${EMPLOYEE_TAG_PREFIX}${employee.id}`],
    originReviewId: latestReview?.id ?? null,
    assignTo: latestReview?.created_by ?? null,
  };
}

function buildReminderTemplate(
  employee: ProfileRow,
  status: PerformanceReviewStatus,
  latestReview: ReviewRow | null,
  linkToTask: boolean,
): ReviewReminderTemplate {
  const name = buildDisplayName(employee);
  const isOverdue = status === 'overdue';
  const remindInDays = isOverdue ? 1 : 5;
  const priority = isOverdue ? 'high' : 'medium';
  const description = [
    `Copilot review reminder for employee:${employee.id}.`,
    `Current status "${status}".`,
    formatLatestReviewSummary(latestReview),
  ].join(' ');
  return {
    employeeId: employee.id,
    title: `Review follow-up for ${name}`,
    description,
    remindInDays,
    priority,
    linkToTask,
  };
}

export function buildReviewAutomationPlan(options: BuildReviewAutomationPlanOptions): ReviewAutomationPlan {
  const { employees, reviews, existingTasks, existingReminders, now = new Date() } = options;
  const reviewMap = new Map<string, ReviewRow[]>();

  reviews.forEach((review) => {
    if (!review.employee_id) return;
    const list = reviewMap.get(review.employee_id) ?? [];
    list.push(review);
    reviewMap.set(review.employee_id, list);
  });

  reviewMap.forEach((list) => {
    list.sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return bDate - aDate;
    });
  });

  const plan: ReviewAutomationPlan = {
    taskTemplates: [],
    reminderTemplates: [],
    statuses: {},
  };

  const activeTaskByEmployee = new Set(
    existingTasks.filter((task) => isTaskActive(task.status)).map((task) => task.employeeId),
  );

  const activeReminderByEmployee = new Set(
    existingReminders.filter((reminder) => !reminder.completed).map((reminder) => reminder.employeeId),
  );

  employees.forEach((employee) => {
    const list = reviewMap.get(employee.id) ?? [];
    const latestReview = list.length > 0 ? list[0] : null;
    const status = determineReviewStatus(
      latestReview?.date ?? null,
      latestReview?.severity ?? null,
      dayjs(now),
    );

    plan.statuses[employee.id] = {
      status,
      latestReviewId: latestReview?.id ?? null,
    };

    const needsTask = (status === 'needs_coaching' || status === 'overdue') && !activeTaskByEmployee.has(employee.id);
    if (needsTask) {
      plan.taskTemplates.push(buildTaskTemplate(employee, status, latestReview));
    }

    const needsReminder =
      (status === 'due_soon' || status === 'overdue') && !activeReminderByEmployee.has(employee.id);
    if (needsReminder) {
      const linkToTask = status === 'overdue';
      plan.reminderTemplates.push(
        buildReminderTemplate(employee, status, latestReview, linkToTask),
      );
    }
  });

  return plan;
}

export async function syncCopilotReviewAutomation(
  params: SyncCopilotReviewAutomationParams,
): Promise<SyncCopilotReviewAutomationResult> {
  const { actorId, companyId, supabaseClient = supabase, now = new Date() } = params;
  if (!actorId) {
    throw new Error('actorId is required to run Copilot automation.');
  }
  if (!companyId) {
    throw new Error('companyId is required to run Copilot automation.');
  }

  const [profilesResult, reviewsResult, existingTasksResult, existingRemindersResult] = await Promise.all([
    supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, company_id')
      .eq('company_id', companyId)
      .eq('employment_status', 'active'),
    supabaseClient
      .from('employee_report')
      .select('id, employee_id, date, severity, notes, created_by')
      .eq('category', 'performance')
      .order('date', { ascending: false }),
    supabaseClient
      .from('tasks')
      .select('id, status, tags')
      .eq('created_by', actorId)
      .eq('source', 'auto')
      .contains('tags', ['copilot', 'review']),
    supabaseClient
      .from('reminders')
      .select('id, description, completed, task_id')
      .eq('user_id', actorId)
      .eq('type', 'copilot_review'),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (existingTasksResult.error) throw existingTasksResult.error;
  if (existingRemindersResult.error) throw existingRemindersResult.error;

  const employees = (profilesResult.data ?? []).filter(
    (profile): profile is ProfileRow => Boolean(profile?.id),
  );

  if (employees.length === 0) {
    const emptyPlan: ReviewAutomationPlan = { taskTemplates: [], reminderTemplates: [], statuses: {} };
    return { createdTasks: [], createdReminders: [], plan: emptyPlan };
  }

  const normalizedExistingTasks: ExistingAutomationTask[] = (existingTasksResult.data ?? [])
    .map((task: TaskRow) => {
      const employeeId = extractEmployeeIdFromTags(task.tags ?? null);
      if (!employeeId) return null;
      return {
        id: task.id,
        employeeId,
        status: task.status ?? null,
      };
    })
    .filter((value): value is ExistingAutomationTask => Boolean(value));

  const normalizedExistingReminders: ExistingAutomationReminder[] = (existingRemindersResult.data ?? [])
    .map((reminder: ReminderRow) => {
      const employeeId = extractEmployeeIdFromDescription(reminder.description ?? null);
      if (!employeeId) return null;
      return {
        id: reminder.id,
        employeeId,
        completed: Boolean(reminder.completed),
      };
    })
    .filter((value): value is ExistingAutomationReminder => Boolean(value));

  const plan = buildReviewAutomationPlan({
    employees,
    reviews: (reviewsResult.data ?? []) as ReviewRow[],
    existingTasks: normalizedExistingTasks,
    existingReminders: normalizedExistingReminders,
    now,
  });

  const nowIso = new Date(now).toISOString();

  const taskPayloads: Array<{ employeeId: string; payload: TablesInsert<'tasks'> }> = plan.taskTemplates.map(
    (template) => {
      const dueDate = dayjs(now).add(template.dueInDays, 'day').toISOString();
      const payload: TablesInsert<'tasks'> = {
        title: `[Co-Pilot] ${template.title}`,
        description: template.description,
        priority: template.priority,
        due_date: dueDate,
        status: 'todo',
        created_by: actorId,
        assigned_to: template.assignTo ?? actorId,
        tags: template.tags,
        links: [] as Json,
        source: 'auto',
        origin_event_id: template.originReviewId,
        goal_id: null,
        department_id: null,
        parent_task_id: null,
        workflow_id: null,
        actual_hours: null,
        estimated_hours: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      return { employeeId: template.employeeId, payload };
    },
  );

  let insertedTaskRows: { id: string }[] = [];
  if (taskPayloads.length > 0) {
    const insertResult = await supabaseClient
      .from('tasks')
      .insert(taskPayloads.map((entry) => entry.payload))
      .select('id');
    if (insertResult.error) throw insertResult.error;
    insertedTaskRows = insertResult.data ?? [];
  }

  const taskIdByEmployee = new Map<string, string>();
  insertedTaskRows.forEach((row, index) => {
    const mapping = taskPayloads[index];
    if (mapping) {
      taskIdByEmployee.set(mapping.employeeId, row.id);
    }
  });

  const reminderPayloads: Array<{ employeeId: string; payload: TablesInsert<'reminders'> }> =
    plan.reminderTemplates.map((template) => {
      const remindAt = dayjs(now).add(template.remindInDays, 'day').toISOString();
      const payload: TablesInsert<'reminders'> = {
        user_id: actorId,
        task_id: null,
        title: `[Co-Pilot] ${template.title}`,
        description: template.description,
        remind_at: remindAt,
        notification_methods: ['in_app'] as Json,
        priority: template.priority,
        type: 'copilot_review',
        completed: false,
        sound_enabled: true,
        sound_type: 'default',
        repeat_enabled: false,
        repeat_interval: null,
        snooze_enabled: true,
        snooze_count: 0,
        auto_complete: false,
        last_triggered_at: null,
        next_reminder_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      if (template.linkToTask) {
        payload.task_id = taskIdByEmployee.get(template.employeeId) ?? null;
      }
      return { employeeId: template.employeeId, payload };
    });

  let insertedReminderRows: { id: string }[] = [];
  if (reminderPayloads.length > 0) {
    const insertResult = await supabaseClient
      .from('reminders')
      .insert(reminderPayloads.map((entry) => entry.payload))
      .select('id');
    if (insertResult.error) throw insertResult.error;
    insertedReminderRows = insertResult.data ?? [];
  }

  const createdTasks = insertedTaskRows.map((row, index) => ({
    id: row.id,
    employeeId: taskPayloads[index]?.employeeId ?? '',
  }));

  const createdReminders = insertedReminderRows.map((row, index) => ({
    id: row.id,
    employeeId: reminderPayloads[index]?.employeeId ?? '',
  }));

  return {
    createdTasks,
    createdReminders,
    plan,
  };
}
