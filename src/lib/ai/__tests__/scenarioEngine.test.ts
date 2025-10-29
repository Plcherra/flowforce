import { describe, expect, it } from 'vitest';
import {
  calculateScenarioOutcome,
  DEFAULT_ADJUSTMENTS,
  type ScenarioBaseline,
} from '../scenarioEngine';

const baseline: ScenarioBaseline = {
  generatedAt: '2024-01-01T00:00:00.000Z',
  scheduling: {
    coverageRate: 0.9,
    totalShifts: 120,
    openShifts: 12,
    averageShiftHours: 6.2,
    overtimeRisk: 0.18,
  },
  tasks: {
    backlog: 40,
    overdue: 8,
    avgAgeDays: 5.1,
  },
  goals: {
    total: 10,
    active: 7,
    avgProgress: 66,
    atRisk: 3,
  },
  revenue: {
    trailing30: 100_000,
    forecastNext30: 110_000,
    operatingCost30: 78_500,
    marginRate: 0.287,
  },
};

describe('scenarioEngine.calculateScenarioOutcome', () => {
  it('increases coverage when staffing investment grows', () => {
    const adjustments = {
      ...DEFAULT_ADJUSTMENTS,
      staffingChangePct: 14,
      overtimeReductionPct: 6,
    };

    const outcome = calculateScenarioOutcome(baseline, adjustments);
    expect(outcome.predicted.coverageRate).toBeGreaterThan(baseline.scheduling.coverageRate);
    expect(outcome.predicted.openShifts).toBeLessThan(baseline.scheduling.openShifts);
  });

  it('reduces backlog with higher task automation', () => {
    const adjustments = {
      ...DEFAULT_ADJUSTMENTS,
      taskAutomationPct: 35,
      staffingChangePct: 0,
    };

    const outcome = calculateScenarioOutcome(baseline, adjustments);
    expect(outcome.predicted.backlog).toBeLessThan(baseline.tasks.backlog);
    expect(outcome.copilotActions.some((action) => action.type === 'tasks')).toBeTruthy();
  });

  it('flags margin risk when revenue outlook drops', () => {
    const adjustments = {
      ...DEFAULT_ADJUSTMENTS,
      staffingChangePct: -6,
      overtimeReductionPct: 0,
      taskAutomationPct: 5,
      revenueChangePct: -12,
    };

    const outcome = calculateScenarioOutcome(baseline, adjustments);
    expect(outcome.risk).not.toBe('low');
    expect(outcome.copilotActions.some((action) => action.type === 'revenue')).toBeTruthy();
  });
});
