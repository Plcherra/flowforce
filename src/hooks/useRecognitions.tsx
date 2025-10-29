import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import type { RecognitionDetails, RecognitionRecord, RecognitionSourceType } from '@/types/recognition';
import type { TrainingAssignment, TrainingModule } from '@/types/training';
import type { Tables } from '@/integrations/supabase/public-types';
import { formatISO, subDays } from 'date-fns';

type GoalRow = Tables<'goals'>;
type GoalMilestoneRow = Tables<'goal_milestones'>;
type GoalTaskRow = Tables<'goal_tasks'>;
type GoalRewardRow = Tables<'goal_rewards'>;
type TaskRow = Tables<'tasks'>;
type ProfileRow = Tables<'profiles'>;

type RecognitionsState = {
  records: RecognitionRecord[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
};

type ManualRecognitionInput = {
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

const DEFAULT_STATE: RecognitionsState = {
  records: [],
  loading: true,
  syncing: false,
  error: null,
};

function parseRecognitionDetails(raw: GoalRewardRow['reward_details']): RecognitionDetails | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as RecognitionDetails;
    } catch (error) {
      console.warn('Failed to parse recognition details string', error);
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as RecognitionDetails;
  }
  return null;
}

export function useRecognitions() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [state, setState] = useState<RecognitionsState>(DEFAULT_STATE);

  const companyId = profile?.companyId ?? null;

  const setPartialState = useCallback((partial: Partial<RecognitionsState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const seedDefaultTrainingModules = useCallback(async () => {
    if (!companyId || !user?.id) return;

    const { data: existingModules, error } = await supabase
      .from('training_modules' as any)
      .select('id')
      .eq('company_id', companyId)
      .limit(1);

    if (error) {
      console.warn('Failed to check existing training modules', error);
      return;
    }

    if (existingModules && existingModules.length > 0) {
      return;
    }

    const defaultModules: Partial<TrainingModule>[] = [
      {
        title: 'Welcome & Company Orientation',
        description: 'Mandatory onboarding session covering company values, policies, and tools.',
        category: 'Onboarding',
        level: 'Beginner',
        duration_minutes: 90,
        xp_reward: 150,
        is_mandatory: true,
      },
      {
        title: 'Core Systems Training',
        description: 'Hands-on walkthrough of ConnectFlow operations suite for new team members.',
        category: 'Operations',
        level: 'Intermediate',
        duration_minutes: 120,
        xp_reward: 200,
        is_mandatory: true,
      },
    ];

    const modulesToInsert = defaultModules.map((module) => ({
      ...module,
      company_id: companyId,
      created_by: user.id,
    }));

    const { error: insertError } = await supabase
      .from('training_modules' as any)
      .insert(modulesToInsert);

    if (insertError) {
      console.warn('Failed to seed default training modules', insertError);
    }
  }, [companyId, user?.id]);

  const ensureNewHireAssignments = useCallback(async () => {
    if (!companyId || !user?.id) return;

    const thirtyDaysAgo = subDays(new Date(), 30);
    const hireDateThreshold = formatISO(thirtyDaysAgo, { representation: 'date' });

    const [{ data: modules }, { data: newHires }] = await Promise.all([
      supabase
        .from('training_modules' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('is_mandatory', true),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, hire_date')
        .eq('company_id', companyId)
        .not('hire_date', 'is', null)
        .gte('hire_date', hireDateThreshold),
    ]);

    if (!modules || modules.length === 0 || !newHires || newHires.length === 0) {
      return;
    }

    const newHireIds = newHires.map((hire) => hire.id);
    const moduleIds = modules.map((module: TrainingModule) => module.id);

    const { data: existingAssignments } = await supabase
      .from('training_assignments' as any)
      .select('module_id, employee_id')
      .in('employee_id', newHireIds)
      .in('module_id', moduleIds);

    const existingAssignmentsSet = new Set(
      (existingAssignments ?? []).map((assignment: { module_id: string; employee_id: string }) => `${assignment.module_id}:${assignment.employee_id}`),
    );

    const assignmentsToInsert = [];

    for (const module of modules as TrainingModule[]) {
      for (const hire of newHires as ProfileRow[]) {
        const key = `${module.id}:${hire.id}`;
        if (!existingAssignmentsSet.has(key)) {
          assignmentsToInsert.push({
            module_id: module.id,
            employee_id: hire.id,
            assigned_by: user.id,
            status: 'not_started',
            progress: 0,
            notes: 'Auto-assigned for new hire onboarding',
            due_date: null,
          });
        }
      }
    }

    if (assignmentsToInsert.length === 0) {
      return;
    }

    const { error } = await supabase
      .from('training_assignments' as any)
      .insert(assignmentsToInsert);

    if (error) {
      console.warn('Failed to auto-assign training modules to new hires', error);
    }
  }, [companyId, user?.id]);

  const fetchExistingRecognitions = useCallback(async () => {
    if (!companyId) return [];

    const baseQuery = supabase
      .from('goal_rewards')
      .select('id, goal_id, user_id, reward_details, reward_type, awarded_at, created_by, goal:goals(id, title, status, company_id)')
      .eq('reward_type', 'recognition')
      .order('awarded_at', { ascending: false });

    const companyFilter = [
      `goal.company_id.eq.${companyId}`,
      `reward_details->metadata->>company_id.eq.${companyId}`,
    ].join(',');

    const { data, error } = await baseQuery.or(companyFilter);

    if (error) {
      throw error;
    }

    return data ?? [];
  }, [companyId]);

  const generateTrainingRecognitions = useCallback(
    async (existing: GoalRewardRow[]) => {
      if (!companyId || !user?.id) return;

      const { data: completions, error } = await supabase
        .from('v_training_completion_events' as any)
        .select('assignment_id, completed_at, employee_id, module_id, module_title, xp_reward, company_id')
        .eq('company_id', companyId);

      if (error) {
        console.warn('Failed to fetch training completion events', error);
        return;
      }

      if (!completions || completions.length === 0) return;

      const existingTrainingRecognitions = new Set<string>();
      existing.forEach((reward) => {
        const details = parseRecognitionDetails(reward.reward_details);
        if (details?.training_assignment_id) {
          existingTrainingRecognitions.add(details.training_assignment_id);
        }
      });

      const assignmentsToFetch = new Set<string>();
      const employeesToFetch = new Set<string>();
      completions.forEach((completion: any) => {
        assignmentsToFetch.add(completion.assignment_id);
        employeesToFetch.add(completion.employee_id);
      });

      const [{ data: assignments }, { data: employees }] = await Promise.all([
        supabase
          .from('training_assignments' as any)
          .select('id, module_id, employee_id, status, progress, completed_at, started_at, module:training_modules(id, title, xp_reward), employee:profiles(id, first_name, last_name, avatar_url)')
          .in('id', Array.from(assignmentsToFetch)),
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', Array.from(employeesToFetch)),
      ]);

      const employeeMap = new Map<string, ProfileRow>();
      (employees ?? []).forEach((profile) => employeeMap.set(profile.id, profile));

      const newRecognitionsPayload = [];

      for (const completion of completions as any[]) {
        if (existingTrainingRecognitions.has(completion.assignment_id)) {
          continue;
        }

        const assigned = assignments?.find((assignment: TrainingAssignment) => assignment.id === completion.assignment_id);
        const employee = employeeMap.get(completion.employee_id);

        if (!assigned || !employee) {
          continue;
        }

        const moduleTitle = assigned.module?.title ?? completion.module_title ?? 'training module';
        const employeeName = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() || 'Team Member';

        const details: RecognitionDetails = {
          source: 'training_completion',
          training_assignment_id: completion.assignment_id,
          message: `${employeeName} completed ${moduleTitle}`,
          xp_awarded: assigned.module?.xp_reward ?? completion.xp_reward ?? null,
          metadata: {
            module_id: assigned.module_id,
            company_id: companyId,
          },
        };

        newRecognitionsPayload.push({
          goal_id: null,
          user_id: completion.employee_id,
          reward_type: 'recognition',
          reward_details: details,
          awarded_at: completion.completed_at ?? new Date().toISOString(),
          created_by: user.id,
        });
      }

      if (newRecognitionsPayload.length === 0) return;

      const { error: insertError } = await supabase
        .from('goal_rewards')
        .insert(newRecognitionsPayload);

      if (insertError) {
        console.warn('Failed to insert training recognitions', insertError);
      }
    },
    [companyId, user?.id],
  );

  const generateMilestoneRecognitions = useCallback(
    async (existing: GoalRewardRow[]) => {
      if (!companyId || !user?.id) return;

      const { data: milestones, error } = await supabase
        .from('goal_milestones')
        .select('id, title, goal_id, completed_at, goal:goals(id, title, status, company_id, created_by)')
        .not('completed_at', 'is', null);

      if (error) {
        console.warn('Failed to fetch goal milestones', error);
        return;
      }

      if (!milestones || milestones.length === 0) return;

      const filteredMilestones = milestones.filter((milestone: any) => milestone.goal?.company_id === companyId);
      if (filteredMilestones.length === 0) return;

      const milestoneParticipants = await supabase
        .from('goal_participants')
        .select('goal_id, user_id, role')
        .in('goal_id', filteredMilestones.map((milestone: GoalMilestoneRow & { goal: GoalRow }) => milestone.goal_id));

      const participantsByGoal = new Map<string, { user_id: string; role: string }[]>();
      (milestoneParticipants.data ?? []).forEach((participant) => {
        const items = participantsByGoal.get(participant.goal_id) ?? [];
        items.push(participant);
        participantsByGoal.set(participant.goal_id, items);
      });

      const existingMilestoneKey = new Set<string>();
      existing.forEach((reward) => {
        const details = parseRecognitionDetails(reward.reward_details);
        if (details?.milestone_id) {
          existingMilestoneKey.add(`${details.milestone_id}:${reward.user_id}`);
        }
      });

      const newRecognitionsPayload = [];

      for (const milestone of filteredMilestones as any[]) {
        const participants = participantsByGoal.get(milestone.goal_id) ?? [];
        const recognitionsTargets = participants.length > 0 ? participants : [{ user_id: milestone.goal.created_by, role: 'owner' }];

        for (const participant of recognitionsTargets) {
          if (!participant?.user_id) continue;
          const key = `${milestone.id}:${participant.user_id}`;
          if (existingMilestoneKey.has(key)) continue;

          const details: RecognitionDetails = {
            source: 'goal_milestone',
            goal_id: milestone.goal_id,
            milestone_id: milestone.id,
            message: `Completed milestone "${milestone.title}" on goal ${milestone.goal?.title ?? ''}`.trim(),
            metadata: {
              company_id: milestone.goal?.company_id,
            },
          };

          newRecognitionsPayload.push({
            goal_id: milestone.goal_id,
            user_id: participant.user_id,
            reward_type: 'recognition',
            reward_details: details,
            awarded_at: milestone.completed_at ?? new Date().toISOString(),
            created_by: user.id,
          });
        }
      }

      if (newRecognitionsPayload.length === 0) return;

      const { error: insertError } = await supabase
        .from('goal_rewards')
        .insert(newRecognitionsPayload);

      if (insertError) {
        console.warn('Failed to insert milestone recognitions', insertError);
      }
    },
    [companyId, user?.id],
  );

  const generateTaskRecognitions = useCallback(
    async (existing: GoalRewardRow[]) => {
      if (!companyId || !user?.id) return;

      const { data: goalTasks, error } = await supabase
        .from('goal_tasks')
        .select('id, goal_id, task_id, milestone_id, goal:goals(id, title, company_id), task:tasks(id, title, status, completed_at, assigned_to)')
        .eq('task.status', 'completed');

      if (error) {
        console.warn('Failed to fetch completed goal tasks', error);
        return;
      }

      if (!goalTasks || goalTasks.length === 0) return;

      const filtered = goalTasks.filter((gt: any) => gt.goal?.company_id === companyId && gt.task?.assigned_to);
      if (filtered.length === 0) return;

      const existingTaskKey = new Set<string>();
      existing.forEach((reward) => {
        const details = parseRecognitionDetails(reward.reward_details);
        if (details?.task_id) {
          existingTaskKey.add(`${details.task_id}:${reward.user_id}`);
        }
      });

      const tasksToFetch = Array.from(new Set(filtered.map((gt: any) => gt.task?.id).filter(Boolean)));
      const { data: taskProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', filtered.map((gt: any) => gt.task?.assigned_to).filter(Boolean));

      const profileMap = new Map<string, ProfileRow>();
      (taskProfiles ?? []).forEach((profile) => profileMap.set(profile.id, profile));

      const newRecognitionsPayload = [];

      for (const gt of filtered as any[]) {
        const task = gt.task as TaskRow & { assigned_to: string | null };
        if (!task?.assigned_to || !task.id) continue;

        const key = `${task.id}:${task.assigned_to}`;
        if (existingTaskKey.has(key)) continue;

        const employee = profileMap.get(task.assigned_to);
        const employeeName = `${employee?.first_name ?? ''} ${employee?.last_name ?? ''}`.trim() || 'Team Member';
        const goalTitle = gt.goal?.title ?? '';

        const details: RecognitionDetails = {
          source: 'task_completion',
          goal_id: gt.goal_id,
          task_id: task.id,
          message: `${employeeName} completed task "${task.title}" for goal ${goalTitle}`.trim(),
          metadata: {
            company_id: gt.goal?.company_id,
            milestone_id: gt.milestone_id,
          },
        };

        newRecognitionsPayload.push({
          goal_id: gt.goal_id,
          user_id: task.assigned_to,
          reward_type: 'recognition',
          reward_details: details,
          awarded_at: task.completed_at ?? new Date().toISOString(),
          created_by: user.id,
        });
      }

      if (newRecognitionsPayload.length === 0) return;

      const { error: insertError } = await supabase
        .from('goal_rewards')
        .insert(newRecognitionsPayload);

      if (insertError) {
        console.warn('Failed to insert task recognitions', insertError);
      }
    },
    [companyId, user?.id],
  );

  const fetchRecognitions = useCallback(async () => {
    if (!companyId) {
      setPartialState({ records: [], loading: false });
      return;
    }

    setPartialState({ loading: true, error: null });

    try {
      const baseQuery = supabase
        .from('goal_rewards')
        .select('id, goal_id, user_id, reward_type, reward_details, awarded_at, created_by, goal:goals(id, title, status, company_id)')
        .eq('reward_type', 'recognition')
        .order('awarded_at', { ascending: false });

      const filter = [
        `goal.company_id.eq.${companyId}`,
        `reward_details->metadata->>company_id.eq.${companyId}`,
      ].join(',');

      const { data, error } = await baseQuery.or(filter);

      if (error) {
        throw error;
      }

      const rawRewards = (data ?? []) as (GoalRewardRow & { goal: GoalRow | null })[];
      const relevantRewards = rawRewards.filter((reward) => {
        const details = parseRecognitionDetails(reward.reward_details);
        const metadataCompanyId = details?.metadata?.company_id;
        return reward.goal?.company_id === companyId || metadataCompanyId === companyId;
      });

      if (relevantRewards.length === 0) {
        setPartialState({ records: [], loading: false });
        return;
      }

      const recipientIds = new Set<string>();
      const creatorIds = new Set<string>();
      const milestoneIds = new Set<string>();
      const taskIds = new Set<string>();
      const assignmentIds = new Set<string>();

      relevantRewards.forEach((reward) => {
        recipientIds.add(reward.user_id);
        creatorIds.add(reward.created_by);
        const details = parseRecognitionDetails(reward.reward_details);
        if (details?.milestone_id) milestoneIds.add(details.milestone_id);
        if (details?.task_id) taskIds.add(details.task_id);
        if (details?.training_assignment_id) assignmentIds.add(details.training_assignment_id);
      });

      const [
        { data: profilesData },
        { data: milestonesData },
        { data: tasksData },
        assignmentsResponse,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, position_id')
          .in('id', Array.from(new Set([...recipientIds, ...creatorIds]))),
        milestoneIds.size > 0
          ? supabase
              .from('goal_milestones')
              .select('id, title, completed_at')
              .in('id', Array.from(milestoneIds))
          : Promise.resolve({ data: [] }),
        taskIds.size > 0
          ? supabase
              .from('tasks')
              .select('id, title, status, completed_at')
              .in('id', Array.from(taskIds))
          : Promise.resolve({ data: [] }),
        assignmentIds.size > 0
          ? supabase
              .from('training_assignments' as any)
              .select('id, module_id, employee_id, status, progress, completed_at, started_at, module:training_modules(id, title, xp_reward, category, level), employee:profiles(id, first_name, last_name, avatar_url)')
              .in('id', Array.from(assignmentIds))
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap = new Map<string, ProfileRow>();
      (profilesData ?? []).forEach((profile) => profileMap.set(profile.id, profile));

      const milestoneMap = new Map<string, GoalMilestoneRow>();
      (milestonesData ?? []).forEach((milestone) => milestoneMap.set(milestone.id, milestone));

      const taskMap = new Map<string, TaskRow>();
      (tasksData ?? []).forEach((task) => taskMap.set(task.id, task));

      const assignmentMap = new Map<string, TrainingAssignment>();
      (assignmentsResponse.data ?? []).forEach((assignment: TrainingAssignment) => assignmentMap.set(assignment.id, assignment));

      const records: RecognitionRecord[] = relevantRewards.map((reward) => {
        const details = parseRecognitionDetails(reward.reward_details);
        return {
          id: reward.id,
          goal_id: reward.goal_id,
          user_id: reward.user_id,
          reward_type: reward.reward_type,
          reward_details: details,
          awarded_at: reward.awarded_at,
          created_by: reward.created_by,
          goal: reward.goal
            ? {
                id: reward.goal.id,
                title: reward.goal.title ?? '',
                status: reward.goal.status ?? '',
                company_id: reward.goal.company_id ?? '',
              }
            : null,
          recipient: profileMap.get(reward.user_id) ?? null,
          creator: profileMap.get(reward.created_by) ?? null,
          milestone: details?.milestone_id ? milestoneMap.get(details.milestone_id) ?? null : null,
          task: details?.task_id ? taskMap.get(details.task_id) ?? null : null,
          training: details?.training_assignment_id ? assignmentMap.get(details.training_assignment_id) ?? null : null,
        };
      });

      setPartialState({ records, loading: false });
    } catch (error) {
      setPartialState({
        error: error instanceof Error ? error.message : 'Failed to load recognitions',
        loading: false,
      });
    }
  }, [companyId, setPartialState]);

  const syncRecognitionAutomation = useCallback(async () => {
    if (!companyId || !user?.id) return;

    setPartialState({ syncing: true });
    try {
      await seedDefaultTrainingModules();
      await ensureNewHireAssignments();
      const existing = await fetchExistingRecognitions();

      await Promise.all([
        generateTrainingRecognitions(existing),
        generateMilestoneRecognitions(existing),
        generateTaskRecognitions(existing),
      ]);

      await fetchRecognitions();
    } catch (error) {
      console.warn('Recognition automation sync failed', error);
      setPartialState({ error: error instanceof Error ? error.message : 'Failed to sync recognitions' });
    } finally {
      setPartialState({ syncing: false });
    }
  }, [
    companyId,
    user?.id,
    seedDefaultTrainingModules,
    ensureNewHireAssignments,
    fetchExistingRecognitions,
    generateTrainingRecognitions,
    generateMilestoneRecognitions,
    generateTaskRecognitions,
    fetchRecognitions,
  ]);

  const createManualRecognition = useCallback(
    async (input: ManualRecognitionInput) => {
      if (!user?.id || !companyId) {
        throw new Error('You must be signed in to create recognitions.');
      }

      const details: RecognitionDetails = {
        source: input.source ?? 'manual',
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

      const { error } = await supabase
        .from('goal_rewards')
        .insert({
          goal_id: input.goalId ?? null,
          user_id: input.userId,
          reward_type: 'recognition',
          reward_details: details,
          awarded_at: new Date().toISOString(),
          created_by: user.id,
        });

      if (error) {
        throw error;
      }

      await fetchRecognitions();
    },
    [companyId, user?.id, fetchRecognitions],
  );

  useEffect(() => {
    if (companyId) {
      fetchRecognitions().catch((error) => {
        console.warn('Failed to fetch recognitions', error);
      });
    } else {
      setPartialState({ records: [], loading: false });
    }
  }, [companyId, fetchRecognitions, setPartialState]);

  const records = useMemo(() => state.records, [state.records]);

  return {
    recognitions: records,
    loading: state.loading,
    syncing: state.syncing,
    error: state.error,
    refresh: fetchRecognitions,
    syncAutomation: syncRecognitionAutomation,
    createManualRecognition,
  };
}
