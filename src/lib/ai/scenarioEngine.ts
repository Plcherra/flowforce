import { addWeeks } from 'date-fns';

export type CopilotActionType = 'scheduling' | 'tasks' | 'goals' | 'revenue';
export type ImpactLevel = 'high' | 'medium' | 'low';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface ScenarioBaseline {
  generatedAt: string;
  scheduling: {
    coverageRate: number; // 0-1
    totalShifts: number;
    openShifts: number;
    averageShiftHours: number;
    overtimeRisk: number; // 0-1 indicator based on uncovered demand
  };
  tasks: {
    backlog: number;
    overdue: number;
    avgAgeDays: number;
  };
  goals: {
    total: number;
    active: number;
    avgProgress: number; // 0-100
    atRisk: number;
  };
  revenue: {
    trailing30: number;
    forecastNext30: number;
    operatingCost30: number;
    marginRate: number; // 0-1
  };
}

export interface ScenarioAdjustments {
  staffingChangePct: number;
  overtimeReductionPct: number;
  taskAutomationPct: number;
  goalFocusPct: number;
  revenueChangePct: number;
  timelineWeeks: number;
}

export interface CopilotActionMetric {
  label: string;
  value: string;
}

export interface CopilotAction {
  id: string;
  type: CopilotActionType;
  title: string;
  summary: string;
  impact: ImpactLevel;
  confidence: number; // 0-1
  suggestedDueDate: string;
  metrics: CopilotActionMetric[];
}

export interface ScenarioOutcome {
  predicted: {
    coverageRate: number;
    openShifts: number;
    backlog: number;
    goalConfidence: number;
    revenueForecast: number;
    marginRate: number;
  };
  deltas: {
    coverageRate: number;
    backlog: number;
    goalConfidence: number;
    revenueForecast: number;
    marginRate: number;
  };
  risk: RiskLevel;
  copilotActions: CopilotAction[];
}

export const DEFAULT_ADJUSTMENTS: ScenarioAdjustments = {
  staffingChangePct: 6,
  overtimeReductionPct: 8,
  taskAutomationPct: 15,
  goalFocusPct: 10,
  revenueChangePct: 5,
  timelineWeeks: 4,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function buildActionId(type: CopilotActionType, seed: number) {
  return `${type}-${Math.round(seed * 1000)}`;
}

export function mapImpactToPriority(impact: ImpactLevel): 'urgent' | 'high' | 'medium' | 'low' {
  switch (impact) {
    case 'high':
      return 'urgent';
    case 'medium':
      return 'high';
    case 'low':
    default:
      return 'medium';
  }
}

function deriveRiskLevel(predictedCoverage: number, predictedBacklog: number, goalConfidence: number, predictedMarginRate: number, baseline: ScenarioBaseline): RiskLevel {
  let score = 0;

  if (predictedCoverage < 0.9) score += 2;
  else if (predictedCoverage < 0.95) score += 1;

  if (predictedBacklog > Math.max(5, baseline.tasks.backlog * 0.8)) score += 2;
  else if (predictedBacklog > Math.max(3, baseline.tasks.backlog * 0.6)) score += 1;

  if (goalConfidence < 65) score += 1;
  if (predictedMarginRate < baseline.revenue.marginRate - 0.04) score += 1;

  if (score >= 3) return 'high';
  if (score === 2) return 'moderate';
  return 'low';
}

function buildSchedulingAction(
  predictedCoverage: number,
  predictedOpenShifts: number,
  baseline: ScenarioBaseline,
  adjustments: ScenarioAdjustments,
): CopilotAction | null {
  if (predictedCoverage >= 0.97 && predictedOpenShifts <= Math.max(2, baseline.scheduling.openShifts * 0.4)) {
    return null;
  }

  const impact: ImpactLevel = predictedCoverage < 0.92 ? 'high' : 'medium';
  const confidenceSeed = clamp(1 - baseline.scheduling.overtimeRisk + adjustments.staffingChangePct / 50, 0.35, 0.85);
  const dueDate = addWeeks(new Date(), adjustments.timelineWeeks);

  return {
    id: buildActionId('scheduling', predictedCoverage),
    type: 'scheduling',
    title: 'Balance upcoming shift coverage',
    summary: `Assign ${Math.ceil(predictedOpenShifts)} additional shifts and re-balance weekend coverage to lift coverage to ${(predictedCoverage * 100).toFixed(1)}%.`,
    impact,
    confidence: Number(confidenceSeed.toFixed(2)),
    suggestedDueDate: dueDate.toISOString(),
    metrics: [
      { label: 'Projected Coverage', value: `${(predictedCoverage * 100).toFixed(1)}%` },
      { label: 'Unfilled Shifts', value: `${Math.max(0, Math.round(predictedOpenShifts))}` },
    ],
  };
}

function buildTaskAction(
  predictedBacklog: number,
  baseline: ScenarioBaseline,
  adjustments: ScenarioAdjustments,
): CopilotAction | null {
  if (predictedBacklog <= Math.max(3, baseline.tasks.backlog * 0.55)) {
    return null;
  }

  const backlogDelta = predictedBacklog - baseline.tasks.backlog;
  const impact: ImpactLevel = predictedBacklog > baseline.tasks.backlog ? 'high' : 'medium';
  const dueDate = addWeeks(new Date(), Math.max(1, Math.min(6, adjustments.timelineWeeks - 1)));

  return {
    id: buildActionId('tasks', predictedBacklog),
    type: 'tasks',
    title: 'Accelerate task throughput',
    summary: `Auto-reassign ${Math.max(3, Math.round(predictedBacklog * 0.35))} tasks to cross-trained staff and enable ${adjustments.taskAutomationPct}% automation for routine updates.`,
    impact,
    confidence: Number(clamp(0.6 + adjustments.taskAutomationPct / 200, 0.4, 0.9).toFixed(2)),
    suggestedDueDate: dueDate.toISOString(),
    metrics: [
      { label: 'Projected Backlog', value: `${Math.round(predictedBacklog)}` },
      { label: 'Backlog Δ', value: `${backlogDelta >= 0 ? '+' : ''}${Math.round(backlogDelta)}` },
    ],
  };
}

function buildGoalAction(
  goalConfidence: number,
  baseline: ScenarioBaseline,
  adjustments: ScenarioAdjustments,
): CopilotAction | null {
  if (baseline.goals.total === 0 || goalConfidence >= 78) {
    return null;
  }

  const dueDate = addWeeks(new Date(), Math.max(1, Math.min(4, adjustments.timelineWeeks - 2)));
  const impact: ImpactLevel = goalConfidence < 65 ? 'high' : 'medium';

  return {
    id: buildActionId('goals', goalConfidence),
    type: 'goals',
    title: 'Stabilize strategic goal delivery',
    summary: `Launch focused coaching sessions for ${Math.max(1, baseline.goals.atRisk)} at-risk goals and attach measurable milestones to lift confidence to ${goalConfidence.toFixed(0)}%.`,
    impact,
    confidence: Number(clamp(0.55 + adjustments.goalFocusPct / 150, 0.45, 0.85).toFixed(2)),
    suggestedDueDate: dueDate.toISOString(),
    metrics: [
      { label: 'Avg. Goal Confidence', value: `${goalConfidence.toFixed(0)}%` },
      { label: 'Goals At Risk', value: `${baseline.goals.atRisk}` },
    ],
  };
}

function buildRevenueAction(
  predictedRevenue: number,
  predictedMarginRate: number,
  baseline: ScenarioBaseline,
  adjustments: ScenarioAdjustments,
): CopilotAction | null {
  if (predictedRevenue >= baseline.revenue.forecastNext30 && predictedMarginRate >= baseline.revenue.marginRate) {
    return null;
  }

  const dueDate = addWeeks(new Date(), Math.max(2, Math.min(8, adjustments.timelineWeeks)));
  const impact: ImpactLevel =
    predictedRevenue < baseline.revenue.forecastNext30 * 0.95 || predictedMarginRate < baseline.revenue.marginRate - 0.05
      ? 'high'
      : 'medium';

  return {
    id: buildActionId('revenue', predictedRevenue),
    type: 'revenue',
    title: 'Protect margin with revenue levers',
    summary: `Bundle high-margin services and tighten overtime guardrails to keep projected revenue near ${predictedRevenue.toFixed(0)} and margin at ${(predictedMarginRate * 100).toFixed(1)}%.`,
    impact,
    confidence: Number(clamp(0.5 + adjustments.revenueChangePct / 120, 0.4, 0.8).toFixed(2)),
    suggestedDueDate: dueDate.toISOString(),
    metrics: [
      { label: 'Projected Revenue (30d)', value: `$${predictedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
      { label: 'Projected Margin', value: `${(predictedMarginRate * 100).toFixed(1)}%` },
    ],
  };
}

export function calculateScenarioOutcome(
  baseline: ScenarioBaseline,
  adjustments: ScenarioAdjustments,
): ScenarioOutcome {
  const coverageBase = baseline.scheduling.coverageRate;

  const staffingEffect = 1 + adjustments.staffingChangePct * 0.008;
  const overtimeEffect = 1 - adjustments.overtimeReductionPct * 0.003;
  const automationCoverageLift = 1 + adjustments.taskAutomationPct * 0.002;

  const predictedCoverage = clamp(
    coverageBase * staffingEffect * overtimeEffect * automationCoverageLift,
    0.75,
    1.15,
  );

  const predictedOpenShifts = Math.max(
    0,
    baseline.scheduling.openShifts * (1 - adjustments.staffingChangePct * 0.75 / 100),
  );

  const backlogBase = baseline.tasks.backlog;
  const backlogReduction = backlogBase * (adjustments.taskAutomationPct * 0.65 / 100);
  const predictedBacklog = clamp(backlogBase - backlogReduction, 0, backlogBase + 20);

  const goalConfidenceBase = baseline.goals.avgProgress;
  const goalBoost = adjustments.goalFocusPct * 0.7 + adjustments.taskAutomationPct * 0.1;
  const coveragePenalty = (coverageBase - predictedCoverage) * 45;
  const predictedGoalConfidence = clamp(goalConfidenceBase + goalBoost - coveragePenalty, 0, 100);

  const revenueBase = baseline.revenue.forecastNext30;
  const revenueStaffingLift = revenueBase * (adjustments.staffingChangePct * 0.12 / 100);
  const revenueAutomationLift = revenueBase * (adjustments.taskAutomationPct * 0.08 / 100);
  const revenueDelta = revenueBase * (adjustments.revenueChangePct * 0.85 / 100);
  const predictedRevenue = Math.max(revenueBase + revenueStaffingLift + revenueAutomationLift + revenueDelta, 0);

  const operatingCostBase = baseline.revenue.operatingCost30;
  const overtimeSavings = operatingCostBase * (adjustments.overtimeReductionPct * 0.4 / 100);
  const automationSavings = operatingCostBase * (adjustments.taskAutomationPct * 0.12 / 100);
  const predictedOperatingCost = clamp(
    operatingCostBase - overtimeSavings - automationSavings,
    operatingCostBase * 0.55,
    operatingCostBase * 1.05,
  );

  const predictedMarginRate =
    predictedRevenue > 0 ? clamp((predictedRevenue - predictedOperatingCost) / predictedRevenue, 0, 0.82) : 0;

  const deltas = {
    coverageRate: predictedCoverage - coverageBase,
    backlog: predictedBacklog - backlogBase,
    goalConfidence: predictedGoalConfidence - goalConfidenceBase,
    revenueForecast: predictedRevenue - revenueBase,
    marginRate: predictedMarginRate - baseline.revenue.marginRate,
  };

  const risk = deriveRiskLevel(predictedCoverage, predictedBacklog, predictedGoalConfidence, predictedMarginRate, baseline);

  const actions: CopilotAction[] = [];

  const schedulingAction = buildSchedulingAction(predictedCoverage, predictedOpenShifts, baseline, adjustments);
  if (schedulingAction) actions.push(schedulingAction);

  const taskAction = buildTaskAction(predictedBacklog, baseline, adjustments);
  if (taskAction) actions.push(taskAction);

  const goalAction = buildGoalAction(predictedGoalConfidence, baseline, adjustments);
  if (goalAction) actions.push(goalAction);

  const revenueAction = buildRevenueAction(predictedRevenue, predictedMarginRate, baseline, adjustments);
  if (revenueAction) actions.push(revenueAction);

  return {
    predicted: {
      coverageRate: predictedCoverage,
      openShifts: predictedOpenShifts,
      backlog: predictedBacklog,
      goalConfidence: predictedGoalConfidence,
      revenueForecast: predictedRevenue,
      marginRate: predictedMarginRate,
    },
    deltas,
    risk,
    copilotActions: actions,
  };
}
