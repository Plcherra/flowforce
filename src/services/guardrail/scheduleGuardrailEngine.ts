import { getScheduleRulebook } from '@/services/scheduleRulebookService';
import type {
  ScheduleRulebook,
  RulebookStep,
  RulebookConstraint,
  StepCriterion,
} from '@/types/scheduleRulebook';

export type GuardrailAction = string;

export interface GuardrailContext {
  rulebookId?: string;
  stepId?: string;
  completedCriteria: Record<string, boolean | number | string>;
  pendingApprovals?: Record<string, boolean>;
  actorRole: string;
  action: GuardrailAction;
  metadata?: Record<string, unknown>;
}

export interface GuardrailResult {
  status: 'allowed' | 'blocked' | 'warning';
  message?: string;
  detail?: GuardrailFailure;
}

export interface GuardrailFailure {
  rulebookId: string;
  stepId?: string;
  criterionId?: string;
  constraintId?: string;
  reason: string;
  severity: 'warning' | 'blocking';
}

export class ScheduleGuardrailEngine {
  private readonly rulebook: ScheduleRulebook;

  constructor(rulebookId?: string) {
    this.rulebook = getScheduleRulebook(rulebookId);
  }

  public evaluate(context: GuardrailContext): GuardrailResult {
    const step = this.resolveStep(context.stepId);

    if (step) {
      const roleAllowed = step.allowedRoles.includes(context.actorRole);
      if (!roleAllowed) {
        return this.blocked(`Role ${context.actorRole} is not permitted to perform ${context.action} on step ${step.title}.`, {
          rulebookId: this.rulebook.id,
          stepId: step.id,
          reason: 'Role not allowed to execute this step.',
          severity: 'blocking',
        });
      }

      const criteriaResult = this.evaluateStepCriteria(step, context);
      if (criteriaResult) {
        return criteriaResult;
      }

      const blockerResult = this.evaluateStepBlockers(step, context.action);
      if (blockerResult) {
        return blockerResult;
      }
    }

    const constraintResult = this.evaluateConstraints(context);
    if (constraintResult) {
      return constraintResult;
    }

    return { status: 'allowed' };
  }

  private resolveStep(stepId?: string): RulebookStep | undefined {
    if (!stepId) {
      return undefined;
    }
    return this.rulebook.steps.find((step) => step.id === stepId);
  }

  private evaluateStepCriteria(step: RulebookStep, context: GuardrailContext): GuardrailResult | undefined {
    const failures: GuardrailFailure[] = step.completionCriteria
      .map((criterion) => this.evaluateCriterion(criterion, context))
      .filter((result): result is GuardrailFailure => Boolean(result));

    if (failures.length === 0) {
      return undefined;
    }

    const blockingFailure = failures.find((failure) => failure.severity === 'blocking');
    if (blockingFailure) {
      return this.blocked(blockingFailure.reason, blockingFailure);
    }

    return {
      status: 'warning',
      message: failures.map((failure) => failure.reason).join('\n'),
      detail: failures[0],
    };
  }

  private evaluateCriterion(criterion: StepCriterion, context: GuardrailContext): GuardrailFailure | undefined {
    const evidence = context.completedCriteria[criterion.id];
    const hasEvidence = Boolean(evidence) || evidence === 0;

    if (!hasEvidence) {
      return {
        rulebookId: this.rulebook.id,
        stepId: context.stepId,
        criterionId: criterion.id,
        reason: `Missing evidence for "${criterion.label}"`,
        severity: 'blocking',
      };
    }

    if (criterion.evidenceType === 'numeric' && typeof criterion.targetValue === 'number') {
      const value = Number(evidence);
      if (Number.isNaN(value) || value < criterion.targetValue) {
        return {
          rulebookId: this.rulebook.id,
          stepId: context.stepId,
          criterionId: criterion.id,
          reason: `${criterion.label} below target (${value} < ${criterion.targetValue}).`,
          severity: 'blocking',
        };
      }
    }

    if (criterion.approverRole && context.pendingApprovals && !context.pendingApprovals[criterion.id]) {
      return {
        rulebookId: this.rulebook.id,
        stepId: context.stepId,
        criterionId: criterion.id,
        reason: `${criterion.label} still pending approval from ${criterion.approverRole}.`,
        severity: 'blocking',
      };
    }

    return undefined;
  }

  private evaluateStepBlockers(step: RulebookStep, action: GuardrailAction): GuardrailResult | undefined {
    if (!step.blockers) {
      return undefined;
    }

    const blocker = step.blockers.find((item) => item.actions.includes(action));
    if (!blocker) {
      return undefined;
    }

    return this.blocked(blocker.message, {
      rulebookId: this.rulebook.id,
      stepId: step.id,
      reason: blocker.message,
      severity: 'blocking',
    });
  }

  private evaluateConstraints(context: GuardrailContext): GuardrailResult | undefined {
    if (!this.rulebook.constraints) {
      return undefined;
    }

    const violations = this.rulebook.constraints
      .filter((constraint) => this.constraintApplies(constraint, context.action))
      .map((constraint) => this.buildConstraintViolation(constraint));

    if (violations.length === 0) {
      return undefined;
    }

    const blockingViolation = violations.find((violation) => violation.severity === 'blocking');
    if (blockingViolation) {
      return this.blocked(blockingViolation.reason, blockingViolation);
    }

    return {
      status: 'warning',
      message: violations.map((violation) => violation.reason).join('\n'),
      detail: violations[0],
    };
  }

  private constraintApplies(constraint: RulebookConstraint, action: GuardrailAction): boolean {
    if (constraint.scope === 'global') {
      return true;
    }
    return Boolean(constraint.actions?.includes(action));
  }

  private buildConstraintViolation(constraint: RulebookConstraint): GuardrailFailure {
    return {
      rulebookId: this.rulebook.id,
      constraintId: constraint.id,
      reason: constraint.description,
      severity: constraint.severity,
    };
  }

  private blocked(message: string, detail: GuardrailFailure): GuardrailResult {
    return {
      status: 'blocked',
      message,
      detail,
    };
  }
}

