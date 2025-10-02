import { describe, expect, it } from 'vitest';
import { ScheduleGuardrailEngine } from '@/services/guardrail/scheduleGuardrailEngine';

describe('ScheduleGuardrailEngine', () => {
  it('allows actions when criteria and constraints pass', () => {
    const engine = new ScheduleGuardrailEngine('restaurant-weekly-schedule-v1');

    const result = engine.evaluate({
      action: 'start_schedule_draft',
      actorRole: 'operations_manager',
      stepId: 'collect-staffing-signals',
      completedCriteria: {
        'pto-reviewed': true,
        'labor-budget-loaded': 1,
        'roster-updated': true,
      },
      pendingApprovals: {
        'pto-reviewed': true,
      },
    });

    expect(result.status).toBe('allowed');
  });

  it('blocks actions when numeric criteria are below target', () => {
    const engine = new ScheduleGuardrailEngine('restaurant-weekly-schedule-v1');

    const result = engine.evaluate({
      action: 'publish_schedule',
      actorRole: 'operations_manager',
      stepId: 'build-shift-draft',
      completedCriteria: {
        'coverage-targets-met': 0.8,
        'skill-mix-validated': true,
        'compliance-check-passed': true,
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.detail?.criterionId).toBe('coverage-targets-met');
  });

  it('blocks publishing when GM approval is missing', () => {
    const engine = new ScheduleGuardrailEngine();

    const result = engine.evaluate({
      action: 'publish_schedule',
      actorRole: 'operations_manager',
      stepId: 'gm-review-approval',
      completedCriteria: {
        'gm-approval': false,
        'swap-requests-addressed': true,
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.detail?.criterionId).toBe('gm-approval');
  });

  it('returns warnings for non-blocking constraints', () => {
    const engine = new ScheduleGuardrailEngine();

    const result = engine.evaluate({
      action: 'assign_shift',
      actorRole: 'operations_manager',
      completedCriteria: {},
    });

    expect(['allowed', 'warning']).toContain(result.status);
  });
});

