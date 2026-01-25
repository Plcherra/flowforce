import { useEffect, useMemo, useState } from 'react';
import { getScheduleRulebook } from '@/services/scheduleRulebookService';
import { fetchRulebookFromSupabase } from '@/services/guardrail/supabaseScheduleRulebookRepository';
import { ScheduleGuardrailEngine, type GuardrailAction, type GuardrailResult } from '@/services/guardrail/scheduleGuardrailEngine';
import type { RulebookStep, ScheduleRulebook, StepCriterion } from '@/types/scheduleRulebook';
import { logger } from '@/utils/logger';
import {
  fetchWorkflowSnapshot as fetchWorkflowSnapshotFromSupabase,
  upsertWorkflowCriterionState,
  setWorkflowCriterionApproval,
  deriveDefaultValue,
  type WorkflowSnapshot,
} from '@/services/guardrail/scheduleWorkflowService';

type CriterionState = {
  completed: boolean;
  value?: number | string | boolean;
  approved?: boolean;
  recordId?: string;
  workflowStepId?: string;
  rulebookCriterionId?: string;
};

type StepState = Record<string, CriterionState>;

type StepsState = Record<string, StepState>;

export type StepProgressState = 'notStarted' | 'inProgress' | 'complete';

export interface StepStatus {
  step: RulebookStep;
  completed: number;
  total: number;
  state: StepProgressState;
}

export interface CopilotEvaluation {
  action: GuardrailAction;
  result: GuardrailResult;
  timestamp: number;
}

export interface UseScheduleCopilotOptions {
  rulebookId?: string;
  source?: 'static' | 'supabase';
  workflowId?: string;
}

export function useScheduleCopilot(options: UseScheduleCopilotOptions = {}) {
  const [rulebook, setRulebook] = useState<ScheduleRulebook>(() => getScheduleRulebook(options.rulebookId));
  const [loading, setLoading] = useState(options.source === 'supabase');
  const engine = useMemo(() => new ScheduleGuardrailEngine(rulebook.id), [rulebook.id]);

  useEffect(() => {
    if (options.source !== 'supabase') {
      setRulebook(getScheduleRulebook(options.rulebookId));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchRulebookFromSupabase(options.rulebookId ?? 'restaurant-weekly-schedule')
      .then((remoteRulebook) => {
        if (!isMounted) return;
        if (remoteRulebook) {
          setRulebook(remoteRulebook);
        } else {
          setRulebook(getScheduleRulebook(options.rulebookId));
        }
      })
      .catch((error) => {
        logger.error('Failed to load rulebook from Supabase', { error, tags: ['error'] });
        if (!isMounted) return;
        setRulebook(getScheduleRulebook(options.rulebookId));
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [options.rulebookId, options.source]);

  const [actorRole, setActorRole] = useState('operations_manager');
  const [currentStepId, setCurrentStepId] = useState(rulebook.steps[0]?.id);
  const [criterionState, setCriterionState] = useState<StepsState>(() => initialiseState(rulebook));
  const [lastEvaluation, setLastEvaluation] = useState<CopilotEvaluation | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(Boolean(options.workflowId));
  const workflowId = options.workflowId;

  useEffect(() => {
    setCriterionState(initialiseState(rulebook));
    setCurrentStepId(rulebook.steps[0]?.id);
  }, [rulebook]);

  useEffect(() => {
    if (!workflowId || !rulebook.steps.length) {
      setWorkflowLoading(false);
      return;
    }

    let active = true;
    setWorkflowLoading(true);

    fetchWorkflowSnapshotFromSupabase(rulebook, workflowId)
      .then((snapshot) => {
        if (!active) return;
        setCriterionState(hydrateStateFromSnapshot(rulebook, snapshot));
      })
      .catch((error) => {
        logger.error('Failed to hydrate workflow state', { error, tags: ['error'] });
      })
      .finally(() => {
        if (active) {
          setWorkflowLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [workflowId, rulebook]);

  const completedCriteria = useMemo(() => flattenCriteria(criterionState), [criterionState]);
  const approvalState = useMemo(() => flattenApprovals(rulebook, criterionState), [rulebook, criterionState]);

  const stepStatuses = useMemo<StepStatus[]>(() => {
    return rulebook.steps.map((step) => {
      const stepCriteria = criterionState[step.id];
      const total = step.completionCriteria.length;
      const completed = step.completionCriteria.filter((criterion) => Boolean(stepCriteria?.[criterion.id]?.completed)).length;
      const state: StepProgressState = completed === 0 ? 'notStarted' : completed === total ? 'complete' : 'inProgress';

      return {
        step,
        completed,
        total,
        state,
      };
    });
  }, [rulebook.steps, criterionState]);

  const currentStep = useMemo(() => rulebook.steps.find((step) => step.id === currentStepId) ?? rulebook.steps[0], [rulebook.steps, currentStepId]);

  const updateCriterion = (stepId: string, criterionId: string, updates: Partial<CriterionState>) => {
    setCriterionState((prev) => {
      const stepState = prev[stepId] ?? {};
      const existing = stepState[criterionId] ?? { completed: false };
      return {
        ...prev,
        [stepId]: {
          ...stepState,
          [criterionId]: {
            ...existing,
            ...updates,
          },
        },
      };
    });
  };

  const toggleCriterion = async (stepId: string, criterion: StepCriterion) => {
    const stepState = criterionState[stepId] ?? {};
    const current = stepState[criterion.id];
    const completed = !(current?.completed ?? false);
    const defaultValue = deriveDefaultValue(criterion);

    if (workflowId && current?.workflowStepId && criterion.recordId) {
      const result = await upsertWorkflowCriterionState({
        recordId: current?.recordId,
        workflowStepId: current.workflowStepId,
        rulebookCriterionId: criterion.recordId,
        status: completed ? 'satisfied' : 'pending',
        value: completed ? (current?.value ?? defaultValue) : undefined,
      });

      if (result) {
        updateCriterion(stepId, criterion.id, {
          completed,
          value: result.value,
          recordId: result.recordId,
          workflowStepId: result.workflowStepId,
          rulebookCriterionId: result.rulebookCriterionId,
        });
      }
      return;
    }

    updateCriterion(stepId, criterion.id, {
      completed,
      value: completed ? (current?.value ?? defaultValue ?? true) : undefined,
    });
  };

  const setCriterionValue = async (stepId: string, criterionId: string, value: number | string) => {
    const stepState = criterionState[stepId] ?? {};
    const current = stepState[criterionId];
    const criterion = findCriterion(rulebook, stepId, criterionId);

    if (workflowId && current?.workflowStepId && criterion?.recordId) {
      const result = await upsertWorkflowCriterionState({
        recordId: current?.recordId,
        workflowStepId: current.workflowStepId,
        rulebookCriterionId: criterion.recordId,
        status: 'satisfied',
        value,
      });

      if (result) {
        updateCriterion(stepId, criterionId, {
          completed: true,
          value: result.value,
          recordId: result.recordId,
          workflowStepId: result.workflowStepId,
          rulebookCriterionId: result.rulebookCriterionId,
        });
      }
      return;
    }

    updateCriterion(stepId, criterionId, { value, completed: true });
  };

  const setCriterionApproval = async (stepId: string, criterionId: string, approved: boolean) => {
    const stepState = criterionState[stepId] ?? {};
    const current = stepState[criterionId];

    if (workflowId && current?.recordId) {
      const result = await setWorkflowCriterionApproval({
        recordId: current.recordId,
        approved,
      });

      if (result) {
        updateCriterion(stepId, criterionId, {
          approved,
          completed: approved || current?.completed || false,
          recordId: result.recordId,
          workflowStepId: result.workflowStepId,
          rulebookCriterionId: result.rulebookCriterionId,
        });
      }
      return;
    }

    updateCriterion(stepId, criterionId, { approved, completed: approved });
  };

  const runAction = (action: GuardrailAction, stepId?: string) => {
    const contextStepId = stepId ?? currentStep?.id;
    const result = engine.evaluate({
      rulebookId: rulebook.id,
      stepId: contextStepId,
      action,
      actorRole,
      completedCriteria,
      pendingApprovals: approvalState,
    });

    setLastEvaluation({
      action,
      result,
      timestamp: Date.now(),
    });

    return result;
  };

  return {
    rulebook,
    loading: loading || workflowLoading,
    actorRole,
    setActorRole,
    currentStep,
    currentStepId,
    setCurrentStepId,
    stepStatuses,
    criterionState,
    toggleCriterion,
    setCriterionValue,
    setCriterionApproval,
    runAction,
    lastEvaluation,
  };
}

function initialiseState(rulebook: ScheduleRulebook): StepsState {
  return rulebook.steps.reduce<StepsState>((acc, step) => {
    const criteriaState = step.completionCriteria.reduce<StepState>((criterionAcc, criterion) => {
      criterionAcc[criterion.id] = {
        completed: false,
        value: undefined,
        approved: criterion.approverRole ? false : undefined,
        rulebookCriterionId: criterion.recordId,
      };
      return criterionAcc;
    }, {});

    acc[step.id] = criteriaState;
    return acc;
  }, {});
}

function flattenCriteria(state: StepsState): Record<string, boolean | number | string> {
  const result: Record<string, boolean | number | string> = {};
  Object.values(state).forEach((stepState) => {
    Object.entries(stepState).forEach(([criterionId, criterion]) => {
      if (criterion.completed) {
        result[criterionId] = criterion.value ?? true;
      }
    });
  });
  return result;
}

function flattenApprovals(rulebook: ScheduleRulebook, state: StepsState): Record<string, boolean> {
  const approvals: Record<string, boolean> = {};
  rulebook.steps.forEach((step) => {
    step.completionCriteria.forEach((criterion) => {
      if (!criterion.approverRole) {
        return;
      }

      const criterionState = state[step.id]?.[criterion.id];
      approvals[criterion.id] = Boolean(criterionState?.approved);
    });
  });
  return approvals;
}

function hydrateStateFromSnapshot(rulebook: ScheduleRulebook, snapshot: WorkflowSnapshot): StepsState {
  const base = initialiseState(rulebook);

  rulebook.steps.forEach((step) => {
    const stepSnapshot = snapshot[step.id];
    const workflowStepId = stepSnapshot?.workflowStepId;
    const criteriaSnapshot = stepSnapshot?.criteria ?? {};

    const stepState = base[step.id] ?? {};

    step.completionCriteria.forEach((criterion) => {
      const state = stepState[criterion.id] ?? {
        completed: false,
        rulebookCriterionId: criterion.recordId,
      } as CriterionState;

      const snapshotCriterion = criteriaSnapshot[criterion.id];

      state.workflowStepId = workflowStepId;
      state.rulebookCriterionId = criterion.recordId;

      if (snapshotCriterion) {
        state.recordId = snapshotCriterion.recordId;
        state.completed = snapshotCriterion.status === 'satisfied';
        state.value = snapshotCriterion.value;
        state.approved = Boolean(snapshotCriterion.approvedAt);
      }

      stepState[criterion.id] = state;
    });

    base[step.id] = stepState;
  });

  return base;
}

function findCriterion(rulebook: ScheduleRulebook, stepId: string, criterionId: string): StepCriterion | undefined {
  const step = rulebook.steps.find((item) => item.id === stepId);
  return step?.completionCriteria.find((criterion) => criterion.id === criterionId);
}
