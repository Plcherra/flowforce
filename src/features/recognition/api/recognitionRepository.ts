import { formatISO, subDays } from "date-fns";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  RecognitionDetails,
  RecognitionRecord,
  RecognitionSourceType,
} from "@/types/recognition";
import type { TrainingAssignment, TrainingModule } from "@/types/training";
import type {
  Tables,
  TablesInsert,
} from "@/integrations/supabase/public-types";
import { logger } from "@/utils/logger";

type GoalRow = Tables<"goals">;
type GoalMilestoneRow = Tables<"goal_milestones">;
type GoalTaskRow = Tables<"goal_tasks">;
type RecognitionRow = Tables<"recognitions">;
type TaskRow = Tables<"tasks">;
type ProfileRow = Tables<"profiles">;

type TrainingCompletionEventRow = {
  assignment_id: string;
  completed_at: string | null;
  employee_id: string;
  module_id: string | null;
  module_title: string | null;
  xp_reward: number | null;
  company_id: string;
};

type GoalMilestoneWithGoal = GoalMilestoneRow & { goal: GoalRow | null };
type GoalTaskWithRelations = GoalTaskRow & {
  goal: GoalRow | null;
  task: TaskRow | null;
};
type GoalParticipantRow = {
  goal_id: string;
  user_id: string;
  role: string | null;
};

export type ManualRecognitionInput = {
  userId: string;
  message: string;
  source?: RecognitionSourceType;
  goalId?: string | null;
  milestoneId?: string | null;
  taskId?: string | null;
  trainingAssignmentId?: string | null;
  xpAwarded?: number | null;
  icon?: string;
};

const recognitionSources = [
  "goal_milestone",
  "goal_completion",
  "task_completion",
  "training_completion",
  "onboarding_completion",
  "manual",
] as const;

const recognitionDetailsSchema = z.object({
  message: z.string().default(""),
  icon: z.string().nullable().optional(),
  source: z.enum(recognitionSources),
  goal_id: z.string().nullable().optional(),
  milestone_id: z.string().nullable().optional(),
  task_id: z.string().nullable().optional(),
  training_assignment_id: z.string().nullable().optional(),
  onboarding_step: z.string().nullable().optional(),
  xp_awarded: z.number().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

const recognitionRowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  goal_id: z.string().nullable(),
  user_id: z.string(),
  reward_type: z.string(),
  reward_details: z.any().nullable(),
  awarded_at: z.string(),
  created_by: z.string(),
  award_rule: z.string().nullable(),
});

const profileSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  position_id: z.string().nullable().optional(),
});

const goalSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
});

const goalMilestoneSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

const taskSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
});

const trainingModuleSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  xp_reward: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  level: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
});

const trainingAssignmentSchema = z.object({
  id: z.string(),
  module_id: z.string().nullable().optional(),
  employee_id: z.string(),
  status: z.string().nullable().optional(),
  progress: z.number().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  module: trainingModuleSchema.nullable().optional(),
  employee: profileSchema.nullable().optional(),
});

const awardRuleSchema = z.object({
  id: z.string(),
  company_id: z.string().nullable().optional(),
  code: z.string(),
  trigger_type: z.string(),
  threshold: z.number(),
  badge_code: z.string().nullable().optional(),
  xp_award: z.number().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
});

const DEFAULT_LOOKBACK_DAYS = 365;
const MAX_RECOGNITION_RESULTS = 500;

function parseRecognitionDetailsValue(raw: unknown): RecognitionDetails | null {
  if (!raw) return null;
  let candidate: unknown = raw;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch (error) {
      logger.warn("Failed to parse recognition details string", {
        error,
        tags: ["warning"],
      });
      return null;
    }
  }
  const parsed = recognitionDetailsSchema.safeParse(candidate);
  if (!parsed.success) {
    logger.warn("Invalid recognition details payload", {
      error: parsed.error,
      tags: ["warning"],
    });
    return null;
  }
  return parsed.data as RecognitionDetails;
}

async function fetchRecognitionRows(
  companyId: string,
  lookbackDays?: number,
  limit?: number,
) {
  const query = supabase
    .from("recognitions")
    .select("*")
    .eq("company_id", companyId)
    .order("awarded_at", { ascending: false });

  if (typeof lookbackDays === "number") {
    const since = formatISO(subDays(new Date(), lookbackDays));
    query.gte("awarded_at", since);
  }

  if (typeof limit === "number") {
    query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message ?? "Failed to load recognitions");
  }
  return recognitionRowSchema.array().parse(data ?? []);
}

async function fetchProfilesByIds(ids: string[], companyId: string) {
  if (ids.length === 0) return new Map<string, ProfileRow>();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, position_id")
    .in("id", Array.from(new Set(ids)))
    .eq("company_id", companyId);
  if (error) {
    throw new Error(error.message ?? "Failed to load profiles");
  }
  const parsed = profileSchema.array().parse(data ?? []);
  return new Map(parsed.map((profile) => [profile.id, profile as ProfileRow]));
}

async function fetchGoalsByIds(ids: string[], companyId: string) {
  if (ids.length === 0) return new Map<string, GoalRow>();
  const { data, error } = await supabase
    .from("goals")
    .select("id, title, status, company_id")
    .in("id", ids)
    .eq("company_id", companyId);
  if (error) {
    throw new Error(error.message ?? "Failed to load goals");
  }
  const parsed = goalSchema.array().parse(data ?? []);
  return new Map(parsed.map((goal) => [goal.id, goal as GoalRow]));
}

async function fetchMilestonesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, GoalMilestoneRow>();
  const { data, error } = await supabase
    .from("goal_milestones")
    .select("id, title, completed_at")
    .in("id", ids);
  if (error) {
    throw new Error(error.message ?? "Failed to load goal milestones");
  }
  const parsed = goalMilestoneSchema.array().parse(data ?? []);
  return new Map(
    parsed.map((milestone) => [milestone.id, milestone as GoalMilestoneRow]),
  );
}

async function fetchTasksByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, TaskRow>();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, completed_at")
    .in("id", ids);
  if (error) {
    throw new Error(error.message ?? "Failed to load tasks");
  }
  const parsed = taskSchema.array().parse(data ?? []);
  return new Map(parsed.map((task) => [task.id, task as TaskRow]));
}

async function fetchAssignmentsByIds(ids: string[], companyId: string) {
  if (ids.length === 0) return new Map<string, TrainingAssignment>();
  const { data, error } = await supabase
    .from("training_assignments")
    .select(
      "id, module_id, employee_id, status, progress, completed_at, started_at, module:training_modules(id, title, xp_reward, category, level, company_id), employee:profiles(id, first_name, last_name, avatar_url, position_id)",
    )
    .in("id", ids);
  if (error) {
    throw new Error(error.message ?? "Failed to load training assignments");
  }
  const parsed = trainingAssignmentSchema.array().parse(data ?? []);
  const scoped = parsed.filter(
    (assignment) =>
      !assignment.module?.company_id ||
      assignment.module.company_id === companyId,
  );
  return new Map(
    scoped.map((assignment) => [
      assignment.id,
      {
        id: assignment.id,
        module_id: assignment.module_id ?? "",
        employee_id: assignment.employee_id,
        status:
          (assignment.status as TrainingAssignment["status"]) ?? "not_started",
        progress: assignment.progress ?? 0,
        started_at: assignment.started_at ?? null,
        completed_at: assignment.completed_at ?? null,
        due_date: null,
        assigned_by: null,
        assigned_at: new Date().toISOString(),
        notes: null,
        module: assignment.module
          ? ({
              id: assignment.module.id,
              company_id: assignment.module.company_id ?? "",
              title: assignment.module.title ?? "",
              description: null,
              category: assignment.module.category ?? null,
              level: assignment.module.level ?? null,
              duration_minutes: null,
              xp_reward: assignment.module.xp_reward ?? null,
              is_mandatory: false,
              created_by: "",
              created_at: "",
              updated_at: "",
            } satisfies TrainingModule)
          : undefined,
        employee: assignment.employee
          ? {
              id: assignment.employee.id,
              first_name: assignment.employee.first_name ?? "",
              last_name: assignment.employee.last_name ?? "",
              avatar_url: assignment.employee.avatar_url ?? undefined,
              position_id: assignment.employee.position_id ?? undefined,
              hire_date: undefined,
            }
          : undefined,
      } satisfies TrainingAssignment,
    ]),
  );
}

export async function fetchRecognitionRecords({
  companyId,
  lookbackDays,
  limit = MAX_RECOGNITION_RESULTS,
}: {
  companyId: string;
  lookbackDays?: number | null;
  limit?: number;
}): Promise<RecognitionRecord[]> {
  const effectiveLookback =
    typeof lookbackDays === "number"
      ? lookbackDays
      : lookbackDays === null
        ? undefined
        : DEFAULT_LOOKBACK_DAYS;
  const rewards = await fetchRecognitionRows(
    companyId,
    effectiveLookback,
    limit,
  );
  if (rewards.length === 0) {
    return [];
  }

  const goalIds = new Set<string>();
  const recipientIds = new Set<string>();
  const creatorIds = new Set<string>();
  const milestoneIds = new Set<string>();
  const taskIds = new Set<string>();
  const assignmentIds = new Set<string>();

  rewards.forEach((reward) => {
    if (reward.goal_id) goalIds.add(reward.goal_id);
    recipientIds.add(reward.user_id);
    creatorIds.add(reward.created_by);
    const details = parseRecognitionDetailsValue(reward.reward_details);
    if (details?.milestone_id) milestoneIds.add(details.milestone_id);
    if (details?.task_id) taskIds.add(details.task_id);
    if (details?.training_assignment_id)
      assignmentIds.add(details.training_assignment_id);
  });

  const [goalMap, profileMap, milestoneMap, taskMap, assignmentMap] =
    await Promise.all([
      fetchGoalsByIds(Array.from(goalIds), companyId),
      (async () => {
        const profileIds = Array.from(
          new Set([...recipientIds, ...creatorIds]),
        );
        return fetchProfilesByIds(profileIds, companyId);
      })(),
      fetchMilestonesByIds(Array.from(milestoneIds)),
      fetchTasksByIds(Array.from(taskIds)),
      fetchAssignmentsByIds(Array.from(assignmentIds), companyId),
    ]);

  return rewards.map((reward) => {
    const details = parseRecognitionDetailsValue(reward.reward_details);
    const goal = reward.goal_id ? (goalMap.get(reward.goal_id) ?? null) : null;
    return {
      id: reward.id,
      goal_id: reward.goal_id,
      user_id: reward.user_id,
      reward_type: reward.reward_type,
      reward_details: details,
      awarded_at: reward.awarded_at,
      created_by: reward.created_by,
      award_rule: reward.award_rule ?? null,
      goal: goal
        ? {
            id: goal.id,
            title: goal.title ?? "",
            status: goal.status ?? "",
            company_id: goal.company_id ?? "",
          }
        : null,
      recipient: profileMap.get(reward.user_id) ?? null,
      creator: profileMap.get(reward.created_by) ?? null,
      milestone: details?.milestone_id
        ? (milestoneMap.get(details.milestone_id) ?? null)
        : null,
      task: details?.task_id ? (taskMap.get(details.task_id) ?? null) : null,
      training: details?.training_assignment_id
        ? (assignmentMap.get(details.training_assignment_id) ?? null)
        : null,
    };
  });
}

export async function createManualRecognition({
  companyId,
  actorId,
  input,
}: {
  companyId: string;
  actorId: string;
  input: ManualRecognitionInput;
}) {
  const details: RecognitionDetails = {
    source: input.source ?? "manual",
    goal_id: input.goalId,
    milestone_id: input.milestoneId,
    task_id: input.taskId,
    training_assignment_id: input.trainingAssignmentId,
    message: input.message,
    icon: input.icon,
    xp_awarded: input.xpAwarded,
    metadata: {
      company_id: companyId,
    },
  };

  const payload: TablesInsert<"goal_rewards"> = {
    goal_id: input.goalId ?? null,
    user_id: input.userId,
    reward_type: "recognition",
    reward_details: details as Tables<"goal_rewards">["reward_details"],
    awarded_at: new Date().toISOString(),
    created_by: actorId,
    company_id: companyId,
  };

  const { error } = await supabase.from("goal_rewards").insert(payload);
  if (error) {
    throw new Error(error.message ?? "Failed to create recognition");
  }
}

export async function fetchExistingRecognitionRows(companyId: string) {
  return fetchRecognitionRows(companyId);
}

async function seedDefaultTrainingModules(companyId: string, actorId: string) {
  const { data: existingModules, error } = await supabase
    .from("training_modules")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (error) {
    throw new Error(error.message ?? "Failed to check training modules");
  }

  if (existingModules && existingModules.length > 0) {
    return;
  }

  const defaultModules: Partial<TrainingModule>[] = [
    {
      title: "Welcome & Company Orientation",
      description:
        "Mandatory onboarding session covering company values, policies, and tools.",
      category: "Onboarding",
      level: "Beginner",
      duration_minutes: 90,
      xp_reward: 150,
      is_mandatory: true,
    },
    {
      title: "Core Systems Training",
      description:
        "Hands-on walkthrough of FlowForce operations for new team members.",
      category: "Operations",
      level: "Intermediate",
      duration_minutes: 120,
      xp_reward: 200,
      is_mandatory: true,
    },
  ];

  const modulesToInsert = defaultModules.map((module) => ({
    ...module,
    company_id: companyId,
    created_by: actorId,
  }));

  const { error: insertError } = await supabase
    .from("training_modules")
    .insert(modulesToInsert);
  if (insertError) {
    throw new Error(insertError.message ?? "Failed to seed training modules");
  }
}

async function ensureNewHireAssignments(companyId: string, actorId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);
  const hireDateThreshold = formatISO(thirtyDaysAgo, {
    representation: "date",
  });

  const [
    { data: modules, error: modulesError },
    { data: newHires, error: newHiresError },
  ] = await Promise.all([
    supabase
      .from("training_modules")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_mandatory", true),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, hire_date")
      .eq("company_id", companyId)
      .not("hire_date", "is", null)
      .gte("hire_date", hireDateThreshold),
  ]);

  if (modulesError)
    throw new Error(modulesError.message ?? "Failed to load training modules");
  if (newHiresError)
    throw new Error(newHiresError.message ?? "Failed to load new hires");
  if (!modules || modules.length === 0 || !newHires || newHires.length === 0) {
    return;
  }

  const newHireIds = newHires.map((hire) => hire.id);
  const moduleIds = modules.map((module: TrainingModule) => module.id);

  const { data: existingAssignments, error } = await supabase
    .from("training_assignments")
    .select("module_id, employee_id")
    .in("employee_id", newHireIds)
    .in("module_id", moduleIds);

  if (error)
    throw new Error(error.message ?? "Failed to load training assignments");

  const existingAssignmentsSet = new Set(
    (existingAssignments ?? []).map(
      (assignment: { module_id: string; employee_id: string }) =>
        `${assignment.module_id}:${assignment.employee_id}`,
    ),
  );

  const assignmentsToInsert: TablesInsert<"training_assignments">[] = [];

  for (const module of modules as TrainingModule[]) {
    for (const hire of newHires as ProfileRow[]) {
      const key = `${module.id}:${hire.id}`;
      if (!existingAssignmentsSet.has(key)) {
        assignmentsToInsert.push({
          module_id: module.id,
          employee_id: hire.id,
          assigned_by: actorId,
          status: "not_started",
          progress: 0,
          notes: "Auto-assigned for new hire onboarding",
          due_date: null,
        } as TablesInsert<"training_assignments">);
      }
    }
  }

  if (assignmentsToInsert.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("training_assignments")
    .insert(assignmentsToInsert);
  if (insertError)
    throw new Error(
      insertError.message ?? "Failed to auto-assign training modules",
    );
}

async function generateTrainingRecognitions(
  companyId: string,
  actorId: string,
  existing: RecognitionRow[],
) {
  const { data: completions, error } = await supabase
    .from("v_training_completion_events")
    .select(
      "assignment_id, completed_at, employee_id, module_id, module_title, xp_reward, company_id",
    )
    .eq("company_id", companyId);

  if (error)
    throw new Error(
      error.message ?? "Failed to fetch training completion events",
    );
  const completionRows: TrainingCompletionEventRow[] =
    (completions ?? []) as TrainingCompletionEventRow[];
  if (completionRows.length === 0) return;

  const existingTrainingRecognitions = new Set<string>();
  existing.forEach((reward) => {
    const details = parseRecognitionDetailsValue(reward.reward_details);
    if (details?.training_assignment_id) {
      existingTrainingRecognitions.add(details.training_assignment_id);
    }
  });

  const assignmentsToFetch = new Set<string>();
  const employeesToFetch = new Set<string>();
  completionRows.forEach((completion) => {
    assignmentsToFetch.add(completion.assignment_id);
    employeesToFetch.add(completion.employee_id);
  });

  const [{ data: assignments }, { data: employees }] = await Promise.all([
    supabase
      .from("training_assignments")
      .select(
        "id, module_id, employee_id, status, progress, completed_at, started_at, module:training_modules(id, title, xp_reward), employee:profiles(id, first_name, last_name, avatar_url)",
      )
      .in("id", Array.from(assignmentsToFetch)),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", Array.from(employeesToFetch)),
  ]);

  if (!assignments) return;

  const assignmentRows = (assignments ?? []) as any[];
  const employeeMap = new Map<string, ProfileRow>();
  ((employees ?? []) as ProfileRow[]).forEach((profile) =>
    employeeMap.set(profile.id, profile),
  );

  const newRecognitionsPayload: TablesInsert<"goal_rewards">[] = [];

  for (const completion of completionRows) {
    if (existingTrainingRecognitions.has(completion.assignment_id)) {
      continue;
    }

    const assigned = assignmentRows.find(
      (assignment) => assignment.id === completion.assignment_id,
    );
    const employee = employeeMap.get(completion.employee_id);

    if (!assigned || !employee) {
      continue;
    }

    const moduleTitle =
      (Array.isArray(assigned.module)
        ? assigned.module[0]?.title
        : assigned.module?.title) ??
      completion.module_title ??
      "training module";
    const employeeName =
      `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim() ||
      "Team Member";

    const details: RecognitionDetails = {
      source: "training_completion",
      training_assignment_id: completion.assignment_id,
      message: `${employeeName} completed ${moduleTitle}`,
      xp_awarded:
        (Array.isArray(assigned.module)
          ? assigned.module[0]?.xp_reward
          : assigned.module?.xp_reward) ??
        completion.xp_reward ??
        null,
      metadata: {
        module_id: assigned.module_id,
        company_id: companyId,
      },
    };

    newRecognitionsPayload.push({
      goal_id: null,
      user_id: completion.employee_id,
      reward_type: "recognition",
      reward_details: details as Tables<"goal_rewards">["reward_details"],
      awarded_at: completion.completed_at ?? new Date().toISOString(),
      created_by: actorId,
      company_id: companyId,
    });
  }

  if (newRecognitionsPayload.length === 0) return;

  const { error: insertError } = await supabase
    .from("goal_rewards")
    .insert(newRecognitionsPayload);
  if (insertError)
    throw new Error(
      insertError.message ?? "Failed to insert training recognitions",
    );
}

async function generateMilestoneRecognitions(
  companyId: string,
  actorId: string,
  existing: RecognitionRow[],
) {
  const { data: milestones, error } = await supabase
    .from("goal_milestones")
    .select(
      "id, title, goal_id, completed_at, goal:goals(id, title, status, company_id, created_by)",
    )
    .not("completed_at", "is", null);

  if (error)
    throw new Error(error.message ?? "Failed to fetch goal milestones");
  if (!milestones || milestones.length === 0) return;

  const milestoneRows = milestones as GoalMilestoneWithGoal[];
  const filteredMilestones = milestoneRows.filter(
    (milestone) => milestone.goal?.company_id === companyId,
  );
  if (filteredMilestones.length === 0) return;

  const milestoneParticipants = await supabase
    .from("goal_participants")
    .select("goal_id, user_id, role")
    .in(
      "goal_id",
      filteredMilestones.map(
        (milestone: GoalMilestoneRow & { goal: GoalRow }) => milestone.goal_id,
      ),
    );

  if (milestoneParticipants.error) {
    throw new Error(
      milestoneParticipants.error.message ?? "Failed to load goal participants",
    );
  }

  const participantsByGoal = new Map<
    string,
    { user_id: string; role: string }[]
  >();
  const participantRows: GoalParticipantRow[] = (milestoneParticipants.data ??
    []) as GoalParticipantRow[];
  participantRows.forEach((participant) => {
    const items = participantsByGoal.get(participant.goal_id) ?? [];
    items.push(participant);
    participantsByGoal.set(participant.goal_id, items);
  });

  const existingMilestoneKey = new Set<string>();
  existing.forEach((reward) => {
    const details = parseRecognitionDetailsValue(reward.reward_details);
    if (details?.milestone_id) {
      existingMilestoneKey.add(`${details.milestone_id}:${reward.user_id}`);
    }
  });

  const newRecognitionsPayload: TablesInsert<"goal_rewards">[] = [];

  for (const milestone of filteredMilestones) {
    const participants = participantsByGoal.get(milestone.goal_id) ?? [];
    const recognitionsTargets =
      participants.length > 0
        ? participants
        : [{ user_id: milestone.goal.created_by, role: "owner" }];

    for (const participant of recognitionsTargets) {
      if (!participant?.user_id) continue;
      const key = `${milestone.id}:${participant.user_id}`;
      if (existingMilestoneKey.has(key)) continue;

      const details: RecognitionDetails = {
        source: "goal_milestone",
        goal_id: milestone.goal_id,
        milestone_id: milestone.id,
        message:
          `Completed milestone "${milestone.title}" on goal ${milestone.goal?.title ?? ""}`.trim(),
        metadata: {
          company_id: milestone.goal?.company_id,
        },
      };

      newRecognitionsPayload.push({
        goal_id: milestone.goal_id,
        user_id: participant.user_id,
        reward_type: "recognition",
        reward_details: details as Tables<"goal_rewards">["reward_details"],
        awarded_at: milestone.completed_at ?? new Date().toISOString(),
        created_by: actorId,
        company_id: companyId,
      });
    }
  }

  if (newRecognitionsPayload.length === 0) return;

  const { error: insertError } = await supabase
    .from("goal_rewards")
    .insert(newRecognitionsPayload);
  if (insertError)
    throw new Error(
      insertError.message ?? "Failed to insert milestone recognitions",
    );
}

async function generateTaskRecognitions(
  companyId: string,
  actorId: string,
  existing: RecognitionRow[],
) {
  const { data: goalTasks, error } = await supabase
    .from("goal_tasks")
    .select(
      "id, goal_id, task_id, milestone_id, goal:goals(id, title, company_id), task:tasks(id, title, status, completed_at, assigned_to)",
    )
    .eq("task.status", "completed");

  if (error) throw new Error(error.message ?? "Failed to fetch goal tasks");
  if (!goalTasks || goalTasks.length === 0) return;

  const taskRows = goalTasks as GoalTaskWithRelations[];
  const filteredTasks = taskRows.filter(
    (task) => task.goal?.company_id === companyId,
  );
  if (filteredTasks.length === 0) return;

  const existingTaskKey = new Set<string>();
  existing.forEach((reward) => {
    const details = parseRecognitionDetailsValue(reward.reward_details);
    if (details?.task_id) {
      existingTaskKey.add(`${details.task_id}:${reward.user_id}`);
    }
  });

  const newRecognitionsPayload: TablesInsert<"goal_rewards">[] = [];

  for (const goalTask of filteredTasks) {
    const assignee = goalTask.task?.assigned_to;
    if (!assignee) continue;
    const key = `${goalTask.task_id}:${assignee}`;
    if (existingTaskKey.has(key)) continue;

    const details: RecognitionDetails = {
      source: "task_completion",
      goal_id: goalTask.goal_id,
      milestone_id: goalTask.milestone_id,
      task_id: goalTask.task_id,
      message:
        `Completed task "${goalTask.task?.title ?? ""}" in goal ${goalTask.goal?.title ?? ""}`.trim(),
      metadata: {
        company_id: goalTask.goal?.company_id,
      },
    };

    newRecognitionsPayload.push({
      goal_id: goalTask.goal_id,
      user_id: assignee,
      reward_type: "recognition",
      reward_details: details as Tables<"goal_rewards">["reward_details"],
      awarded_at: goalTask.task?.completed_at ?? new Date().toISOString(),
      created_by: actorId,
      company_id: companyId,
    });
  }

  if (newRecognitionsPayload.length === 0) return;

  const { error: insertError } = await supabase
    .from("goal_rewards")
    .insert(newRecognitionsPayload);
  if (insertError)
    throw new Error(
      insertError.message ?? "Failed to insert task recognitions",
    );
}

async function applyAwardRules(
  companyId: string,
  actorId: string,
  existing: RecognitionRow[],
) {
  const { data: rules, error } = await supabase
    .from("recognition_award_rules")
    .select("*")
    .or(`company_id.eq.${companyId},company_id.is.null`);

  if (error)
    throw new Error(error.message ?? "Failed to load recognition award rules");
  if (!rules || rules.length === 0) return;

  const parsedRules = awardRuleSchema.array().parse(rules ?? []);
  const groupedRules = {
    goal_completed: parsedRules.filter(
      (rule) => rule.trigger_type === "goal_completed",
    ),
    training_completed: parsedRules.filter(
      (rule) => rule.trigger_type === "learning_completed",
    ),
    recognition_count: parsedRules.filter(
      (rule) => rule.trigger_type === "recognition_count",
    ),
  };

  const inserts: TablesInsert<"goal_rewards">[] = [];
  const goalCompletions = new Map<string, number>();
  const trainingCompletions = new Map<string, number>();
  const recognitionCounts = new Map<string, number>();

  existing.forEach((reward) => {
    const details = parseRecognitionDetailsValue(reward.reward_details);
    if (!details) return;

    if (details.source === "goal_completion") {
      goalCompletions.set(
        reward.user_id,
        (goalCompletions.get(reward.user_id) ?? 0) + 1,
      );
    }
    if (details.source === "training_completion") {
      trainingCompletions.set(
        reward.user_id,
        (trainingCompletions.get(reward.user_id) ?? 0) + 1,
      );
    }
    recognitionCounts.set(
      reward.user_id,
      (recognitionCounts.get(reward.user_id) ?? 0) + 1,
    );
  });

  const queueInsert = (
    userId: string,
    rule: z.infer<typeof awardRuleSchema>,
    source: RecognitionSourceType,
  ) => {
    const details: RecognitionDetails = {
      source,
      message: `Achieved ${rule.code.replace(/_/g, " ")} milestone`,
      metadata: rule.metadata ?? undefined,
      xp_awarded: rule.xp_award ?? null,
    };

    inserts.push({
      goal_id: null,
      user_id: userId,
      reward_type: "recognition",
      reward_details: details as Tables<"goal_rewards">["reward_details"],
      awarded_at: new Date().toISOString(),
      created_by: actorId,
      company_id: companyId,
      award_rule: rule.code,
    });
  };

  const existingAwardRuleKey = new Set(
    existing
      .filter((reward) => reward.award_rule)
      .map((reward) => `${reward.award_rule}:${reward.user_id}`),
  );

  const enqueueIfNeeded = (
    map: Map<string, number>,
    rulesForTrigger: z.infer<typeof awardRuleSchema>[],
    source: RecognitionSourceType,
  ) => {
    rulesForTrigger.forEach((rule) => {
      map.forEach((count, employeeId) => {
        const key = `${rule.code}:${employeeId}`;
        if (count >= rule.threshold && !existingAwardRuleKey.has(key)) {
          queueInsert(employeeId, rule, source);
          existingAwardRuleKey.add(key);
        }
      });
    });
  };

  enqueueIfNeeded(
    goalCompletions,
    groupedRules.goal_completed,
    "goal_completion",
  );
  enqueueIfNeeded(
    trainingCompletions,
    groupedRules.training_completed,
    "training_completion",
  );
  enqueueIfNeeded(recognitionCounts, groupedRules.recognition_count, "manual");

  if (inserts.length === 0) {
    return;
  }

  const { error: insertError } = await supabase
    .from("goal_rewards")
    .insert(inserts);
  if (insertError)
    throw new Error(
      insertError.message ?? "Failed to insert award rule recognitions",
    );
}

export async function syncRecognitionAutomation({
  companyId,
  actorId,
}: {
  companyId: string;
  actorId: string;
}) {
  await seedDefaultTrainingModules(companyId, actorId);
  await ensureNewHireAssignments(companyId, actorId);
  const existing = await fetchExistingRecognitionRows(companyId);

  await Promise.all([
    generateTrainingRecognitions(companyId, actorId, existing),
    generateMilestoneRecognitions(companyId, actorId, existing),
    generateTaskRecognitions(companyId, actorId, existing),
  ]);

  const refreshed = await fetchExistingRecognitionRows(companyId);
  await applyAwardRules(companyId, actorId, refreshed);
}

export const recognitionRepository = {
  fetchRecognitionRecords,
  createManualRecognition,
  fetchExistingRecognitionRows,
  syncRecognitionAutomation,
};
