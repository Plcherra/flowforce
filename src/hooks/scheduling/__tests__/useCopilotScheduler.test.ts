import { randomUUID } from 'node:crypto';
import { addDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { generateDraftSchedulePlan } from '@/hooks/scheduling/copilotSchedulerPlan';
import { rotateSupervisors, type EmployeeState } from '@/hooks/scheduling/copilotSchedulerMath';
import type {
  CoverageTemplatePlan,
  SchedulerEmployee,
} from '@/hooks/scheduling/copilotSchedulerTypes';

const weekStart = new Date('2024-03-04T00:00:00.000Z');
const weekEnd = addDays(weekStart, 6);

const baseForecast = (templateId: string, requiredCount: number) => ({
  templateId,
  requiredCount,
  scale: requiredCount,
  lowerBound: 0.8,
  upperBound: 1.2,
  isAnomaly: false,
});

const buildForecastMap = (entries: Array<[string, number]>) => {
  const map = new Map<string, ReturnType<typeof baseForecast>>();
  entries.forEach(([templateId, count]) => {
    map.set(templateId, baseForecast(templateId, count));
  });
  return map;
};

const makeEmployee = (overrides: Partial<SchedulerEmployee>): SchedulerEmployee => ({
  id: overrides.id ?? randomUUID(),
  companyId: 'company-1',
  profileId: overrides.profileId ?? randomUUID(),
  displayName: overrides.displayName ?? null,
  role: overrides.role ?? 'Supervisor',
  secondaryRoles: overrides.secondaryRoles ?? [],
  homeStore: overrides.homeStore ?? 'Store 1',
  weeklyMaxHours: overrides.weeklyMaxHours ?? 38,
  availability: overrides.availability ?? {
    mon: [{ start: '07:00', end: '18:00' }],
    tue: [{ start: '07:00', end: '18:00' }],
    wed: [{ start: '07:00', end: '18:00' }],
    thu: [{ start: '07:00', end: '18:00' }],
    fri: [{ start: '07:00', end: '18:00' }],
  },
  metadata: overrides.metadata ?? {},
});

const makeTemplate = (overrides: Partial<CoverageTemplatePlan>): CoverageTemplatePlan => ({
  id: overrides.id ?? randomUUID(),
  companyId: 'company-1',
  name: overrides.name ?? 'Coverage',
  role: overrides.role ?? 'Supervisor',
  location: overrides.location ?? 'Store 1',
  dayOfWeek: overrides.dayOfWeek ?? 1,
  startTime: overrides.startTime ?? '08:00',
  endTime: overrides.endTime ?? '16:00',
  requiredCount: overrides.requiredCount ?? 1,
  forecastMultiplier: overrides.forecastMultiplier ?? 1,
  metadata: overrides.metadata ?? null,
  priority: overrides.priority ?? 5,
  flexMinutes: overrides.flexMinutes ?? 0,
});

describe('generateDraftSchedulePlan', () => {
  it('calculates total hours across assigned shifts', () => {
    const employees = [makeEmployee({ id: 'emp-a' }), makeEmployee({ id: 'emp-b' })];
    const templates = [makeTemplate({ id: 'tpl-1', dayOfWeek: 1, requiredCount: 2 })];
    const forecastMap = buildForecastMap([
      ['tpl-1', 2],
    ]);

    const plan = generateDraftSchedulePlan({
      employees,
      templates,
      weekStart,
      weekEnd,
      forecastMap,
    });

    expect(plan.draftShifts).toHaveLength(2);
    expect(plan.summary.totalHours).toBeCloseTo(16, 2);
  });

  it('respects availability and 38-hour per store cap', () => {
    const limitedEmployee = makeEmployee({
      id: 'limited',
      weeklyMaxHours: 50,
      availability: {
        mon: [{ start: '09:00', end: '19:00' }],
        tue: [{ start: '09:00', end: '19:00' }],
        wed: [{ start: '09:00', end: '19:00' }],
        thu: [{ start: '09:00', end: '12:00' }],
      },
    });
    const helperEmployee = makeEmployee({ id: 'helper', homeStore: 'Store 2' });

    const templates = [
      makeTemplate({ id: 'tpl-mon', dayOfWeek: 1, startTime: '09:00', endTime: '19:00' }),
      makeTemplate({ id: 'tpl-tue', dayOfWeek: 2, startTime: '09:00', endTime: '19:00' }),
      makeTemplate({ id: 'tpl-wed', dayOfWeek: 3, startTime: '09:00', endTime: '19:00' }),
      makeTemplate({ id: 'tpl-thu', dayOfWeek: 4, startTime: '09:00', endTime: '19:00' }),
    ];

    const forecastMap = buildForecastMap([
      ['tpl-mon', 1],
      ['tpl-tue', 1],
      ['tpl-wed', 1],
      ['tpl-thu', 1],
    ]);

    const plan = generateDraftSchedulePlan({
      employees: [limitedEmployee, helperEmployee],
      templates,
      weekStart,
      weekEnd,
      forecastMap,
    });

    const totalHours = plan.summary.hoursByEmployee['limited'] ?? 0;
    expect(totalHours).toBeLessThanOrEqual(38);
    const thursdayGap = plan.coverageGaps.find((gap) => gap.templateId === 'tpl-thu');
    expect(thursdayGap).toBeDefined();
  });

  it('proposes valid swap suggestions for cross-store coverage gaps', () => {
    const supervisorStore2Primary = makeEmployee({ id: 'sup-s2-primary', homeStore: 'Store 2', weeklyMaxHours: 8 });
    const supervisorStore2Flex = makeEmployee({ id: 'sup-s2-flex', homeStore: 'Store 2', weeklyMaxHours: 8 });
    const supervisorStore1Unavailable = makeEmployee({ id: 'sup-s1-unavailable', homeStore: 'Store 1', availability: { mon: [] }, weeklyMaxHours: 0 });

    const templates = [
      makeTemplate({ id: 'tpl-store2', dayOfWeek: 1, location: 'Store 2', requiredCount: 2 }),
      makeTemplate({ id: 'tpl-store1', dayOfWeek: 1, location: 'Store 1', requiredCount: 1 }),
    ];

    const forecastMap = buildForecastMap([
      ['tpl-store2', 2],
      ['tpl-store1', 1],
    ]);

    const plan = generateDraftSchedulePlan({
      employees: [supervisorStore2Primary, supervisorStore2Flex, supervisorStore1Unavailable],
      templates,
      weekStart,
      weekEnd,
      forecastMap,
    });

    expect(plan.coverageGaps.length).toBeGreaterThan(0);
    expect(plan.swapSuggestions.length).toBeGreaterThan(0);
  });
});

describe('rotateSupervisors', () => {
  it('balances supervisors across stores', () => {
    const supervisorA = makeEmployee({ id: 'sup-A', homeStore: 'Store 1' });
    const supervisorB = makeEmployee({ id: 'sup-B', homeStore: 'Store 2' });

    const states: EmployeeState[] = [
      { employee: supervisorA, hours: 0, hoursByStore: { 'Store 1': 8 } },
      { employee: supervisorB, hours: 0, hoursByStore: { 'Store 2': 8 } },
    ];

    const ledger = new Map<string, { assignmentsByStore: Record<string, number>; totalAssignments: number }>();

    const orderedForStore1 = rotateSupervisors(states, 'Store 1', ledger);
    const orderedForStore2 = rotateSupervisors(states, 'Store 2', ledger);

    expect(orderedForStore1[0].employee.id).toBe('sup-A');
    expect(orderedForStore2[0].employee.id).toBe('sup-B');
  });
});
