import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/public-types';
import {
  determineReviewStatus,
  fetchPerformanceDataset,
  createPerformanceRecord,
  updatePerformanceRecord,
  deletePerformanceRecord,
  simulatePerformanceCrud,
} from '@/services/performance/performanceService';
import { generateMockPerformanceDataset } from '@/services/performance/performanceMocks';

type QueryResult = { data: any; error: any };

function createQueryBuilder(result: QueryResult) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () =>
      createQueryBuilder({
        data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
        error: result.error,
      }),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return builder;
}

function createDatasetSupabaseStub(responses: Record<string, QueryResult>) {
  const calls: string[] = [];
  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from(table: string) {
      calls.push(table);
      const response = responses[table] ?? { data: [], error: null };
      return createQueryBuilder(response);
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

function createCrudSupabaseStub() {
  const state = {
    insertPayload: null as TablesInsert<'staff_performance'> | null,
    updatePayload: null as TablesUpdate<'staff_performance'> | null,
    updateFilter: null as { column: string; value: unknown } | null,
    deleteFilter: null as { column: string; value: unknown } | null,
  };

  const insertedRecord = {
    id: 'perf-record-1',
    user_id: 'emp-1',
    date: '2025-01-01',
    role: 'Barista',
    performance_score: 4,
    attendance_status: 'present',
    created_at: dayjs().toISOString(),
    notes: null,
    overtime_hours: null,
    hours_worked: null,
    break_compliance: null,
  };

  const updatedRecord = {
    ...insertedRecord,
    performance_score: 5,
  };

  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from(table: string) {
      if (table !== 'staff_performance') {
        throw new Error(`Unexpected table requested: ${table}`);
      }
      return {
        insert(payload: TablesInsert<'staff_performance'>) {
          state.insertPayload = payload;
          const result = { data: insertedRecord, error: null };
          return {
            select: () => ({
              single: () => ({
                then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
              }),
            }),
          };
        },
        update(payload: TablesUpdate<'staff_performance'>) {
          state.updatePayload = payload;
          return {
            eq(column: string, value: unknown) {
              state.updateFilter = { column, value };
              const result = { data: updatedRecord, error: null };
              return {
                select: () => ({
                  single: () => ({
                    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
                  }),
                }),
              };
            },
          };
        },
        delete() {
          return {
            eq(column: string, value: unknown) {
              state.deleteFilter = { column, value };
              const result = { error: null };
              return {
                then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
              };
            },
          };
        },
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    state,
    insertedRecord,
    updatedRecord,
  };
}

type SimulationTable = 'profiles' | 'staff_performance' | 'employee_report' | 'goals' | 'goal_participants';

interface SimulationState {
  profiles: Record<string, any>[];
  staff_performance: Record<string, any>[];
  employee_report: Record<string, any>[];
  goals: Record<string, any>[];
  goal_participants: Record<string, any>[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createSimulationSupabaseStub(initialState?: Partial<SimulationState>) {
  const state: SimulationState = {
    profiles: [],
    staff_performance: [],
    employee_report: [],
    goals: [],
    goal_participants: [],
    ...initialState,
  };

  const counters = new Map<SimulationTable, number>();

  function createSelectBuilder(table: SimulationTable) {
    const filters: ((row: Record<string, any>) => boolean)[] = [];
    let orderColumn: string | null = null;
    let ascending = true;
    let limitCount: number | null = null;

    const execute = () => {
      const rows = state[table] ?? [];
      let filtered = rows.filter((row) => filters.every((predicate) => predicate(row)));
      if (orderColumn) {
        filtered = [...filtered].sort((a, b) => {
          const aVal = a[orderColumn];
          const bVal = b[orderColumn];
          if (aVal === bVal) return 0;
          if (aVal === undefined || aVal === null) return ascending ? -1 : 1;
          if (bVal === undefined || bVal === null) return ascending ? 1 : -1;
          if (aVal > bVal) return ascending ? 1 : -1;
          if (aVal < bVal) return ascending ? -1 : 1;
          return 0;
        });
      } else {
        filtered = [...filtered];
      }

      if (limitCount !== null) {
        filtered = filtered.slice(0, limitCount);
      }

      return { data: filtered.map((row) => deepClone(row)), error: null };
    };

    return {
      select() {
        return this;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return this;
      },
      gte(column: string, value: unknown) {
        filters.push((row) => {
          const rowValue = row[column];
          if (rowValue === null || rowValue === undefined) return false;
          return rowValue >= value;
        });
        return this;
      },
      order(column: string, options?: { ascending?: boolean }) {
        orderColumn = column;
        ascending = options?.ascending !== false;
        return this;
      },
      limit(count: number) {
        limitCount = count;
        return this;
      },
      then(onFulfilled: any, onRejected: any) {
        return Promise.resolve(execute()).then(onFulfilled, onRejected);
      },
      single() {
        return Promise.resolve(execute()).then((result) => ({
          data: result.data[0] ?? null,
          error: result.error,
        }));
      },
    };
  }

  function createInsertBuilder(table: SimulationTable, payload: Record<string, any>) {
    const nextId = (counters.get(table) ?? 0) + 1;
    counters.set(table, nextId);

    const record: Record<string, any> = {
      ...payload,
      id: payload.id ?? `${table}-${nextId}`,
    };

    if ('created_at' in record && !record.created_at) {
      record.created_at = dayjs().toISOString();
    }
    if ('updated_at' in record && !record.updated_at) {
      record.updated_at = dayjs().toISOString();
    }
    if (table === 'goal_participants' && !record.joined_at) {
      record.joined_at = dayjs().toISOString();
    }

    state[table] = [...state[table], record];

    return {
      select() {
        return {
          single: () => Promise.resolve({ data: deepClone(record), error: null }),
        };
      },
      then(onFulfilled: any, onRejected: any) {
        return Promise.resolve({ data: deepClone(record), error: null }).then(onFulfilled, onRejected);
      },
    };
  }

  function createUpdateBuilder(table: SimulationTable, updates: Record<string, any>) {
    return {
      eq(column: string, value: unknown) {
        const rows = state[table];
        const record = rows.find((row) => row[column] === value);
        if (!record) {
          const error = { message: `${table} record not found` };
          return {
            select: () => ({
              single: () => Promise.resolve({ data: null, error }),
            }),
          };
        }

        Object.assign(record, updates);
        if ('updated_at' in record) {
          record.updated_at = dayjs().toISOString();
        }

        return {
          select: () => ({
            single: () => Promise.resolve({ data: deepClone(record), error: null }),
          }),
        };
      },
    };
  }

  function createDeleteBuilder(table: SimulationTable) {
    return {
      eq(column: string, value: unknown) {
        const rows = state[table];
        const index = rows.findIndex((row) => row[column] === value);
        if (index !== -1) {
          rows.splice(index, 1);
        }
        return Promise.resolve({ error: null });
      },
    };
  }

  const client = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from(table: SimulationTable) {
      if (!(table in state)) {
        throw new Error(`Unexpected table requested: ${table}`);
      }

      return {
        select: () => createSelectBuilder(table),
        insert: (payload: Record<string, any>) => createInsertBuilder(table, payload),
        update: (updates: Record<string, any>) => createUpdateBuilder(table, updates),
        delete: () => createDeleteBuilder(table),
      };
    },
  };

  return {
    client: client as unknown as SupabaseClient,
    state,
  };
}

describe('performance service utilities', () => {
  it('generates mock performance dataset with radar metrics', () => {
    const dataset = generateMockPerformanceDataset();
    expect(dataset.employees.length).toBeGreaterThan(0);
    expect(dataset.goalSummary.total).toBeGreaterThan(0);
    expect(dataset.radar).toHaveLength(4);
    const totalGoalsFromEmployees = dataset.employees.reduce(
      (sum, employee) => sum + employee.goals.length,
      0,
    );
    expect(totalGoalsFromEmployees).toBe(dataset.goalSummary.total);
  });

  it('determines review status based on recency and severity', () => {
    expect(determineReviewStatus(dayjs().format('YYYY-MM-DD'), 5)).toBe('on_track');
    expect(determineReviewStatus(dayjs().subtract(120, 'day').format('YYYY-MM-DD'), 4)).toBe(
      'due_soon',
    );
    expect(determineReviewStatus(dayjs().subtract(200, 'day').format('YYYY-MM-DD'), 4)).toBe(
      'overdue',
    );
    expect(determineReviewStatus(dayjs().subtract(30, 'day').format('YYYY-MM-DD'), 2)).toBe(
      'needs_coaching',
    );
  });

  it('aggregates performance dataset across profiles, goals, and reviews', async () => {
    const responses: Record<string, QueryResult> = {
      profiles: {
        data: [
          {
            id: 'emp-1',
            first_name: 'Alex',
            last_name: 'Rivera',
            role: 'Manager',
            avatar_url: null,
            employment_status: 'active',
          },
        ],
        error: null,
      },
      staff_performance: {
        data: [
          {
            id: 'perf-1',
            user_id: 'emp-1',
            date: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
            performance_score: 4,
            attendance_status: 'present',
            role: 'Manager',
            hours_worked: null,
            overtime_hours: null,
            notes: null,
            created_at: null,
            break_compliance: null,
          },
        ],
        error: null,
      },
      employee_report: {
        data: [
          {
            id: 'review-1',
            employee_id: 'emp-1',
            date: dayjs().subtract(20, 'day').format('YYYY-MM-DD'),
            severity: 4,
            notes: 'Great leadership on recent launch.',
            created_by: 'mgr-1',
            category: 'performance',
          },
        ],
        error: null,
      },
      goals: {
        data: [
          {
            id: 'goal-1',
            title: 'Boost launch readiness',
            status: 'active',
            progress: 80,
            target_completion_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
            created_at: dayjs().subtract(5, 'day').toISOString(),
          },
        ],
        error: null,
      },
      goal_participants: {
        data: [
          {
            id: 'participant-1',
            goal_id: 'goal-1',
            user_id: 'emp-1',
            role: 'owner',
            contribution_score: 90,
          },
        ],
        error: null,
      },
    };

    const { client, calls } = createDatasetSupabaseStub(responses);
    const dataset = await fetchPerformanceDataset(client);

    expect(calls).toEqual(
      expect.arrayContaining(['profiles', 'staff_performance', 'employee_report', 'goals', 'goal_participants']),
    );
    expect(dataset.employees).toHaveLength(1);
    const employee = dataset.employees[0];
    expect(employee.metrics.performanceScore).toBeGreaterThan(0);
    expect(employee.goals).toHaveLength(1);
    expect(employee.reviews[0].status).toBe('on_track');
    expect(dataset.goalSummary.total).toBe(1);
    expect(dataset.radar[0].metric).toBe('Performance Score');
  });

  it('propagates supabase errors when building dataset', async () => {
    const failingResponses: Record<string, QueryResult> = {
      profiles: {
        data: null,
        error: { message: 'profiles failure' },
      },
    };
    const { client } = createDatasetSupabaseStub(failingResponses);
    await expect(fetchPerformanceDataset(client)).rejects.toThrow('profiles failure');
  });

  it('performs CRUD operations for staff performance records', async () => {
    const { client, state, insertedRecord, updatedRecord } = createCrudSupabaseStub();

    const insertPayload: TablesInsert<'staff_performance'> = {
      user_id: 'emp-1',
      date: '2025-01-01',
      role: 'Barista',
      performance_score: 4,
    };

    const created = await createPerformanceRecord(insertPayload, client);
    expect(created).toEqual(insertedRecord);
    expect(state.insertPayload).toEqual(insertPayload);

    const updatePayload: TablesUpdate<'staff_performance'> = {
      performance_score: 5,
    };
    const updated = await updatePerformanceRecord(insertedRecord.id, updatePayload, client);
    expect(updated).toEqual(updatedRecord);
    expect(state.updatePayload).toEqual(updatePayload);
    expect(state.updateFilter).toEqual({ column: 'id', value: insertedRecord.id });

    await expect(deletePerformanceRecord(insertedRecord.id, client)).resolves.toBeUndefined();
    expect(state.deleteFilter).toEqual({ column: 'id', value: insertedRecord.id });
  });

  it('simulates CRUD lifecycle for performance reviews and goals', async () => {
    const { client } = createSimulationSupabaseStub({
      profiles: [
        {
          id: 'emp-sim-1',
          first_name: 'Sky',
          last_name: 'Rowe',
          role: 'Shift Lead',
          avatar_url: null,
          employment_status: 'active',
        },
      ],
    });

    const result = await simulatePerformanceCrud({
      employeeId: 'emp-sim-1',
      reviewerId: 'mgr-1',
      companyId: 'company-1',
      client,
      referenceDate: dayjs('2025-03-15'),
    });

    const { baseline, postCreate, postUpdate, postCleanup } = result.snapshots;
    expect(baseline.employees[0].goals).toHaveLength(0);
    expect(baseline.employees[0].reviews).toHaveLength(0);

    expect(postCreate.employees[0].reviews).toHaveLength(1);
    expect(postCreate.employees[0].goals).toHaveLength(1);
    expect(postCreate.employees[0].goals[0].title).toContain('Simulation goal');

    expect(postUpdate.employees[0].reviews[0].severity).toBe(5);
    expect(postUpdate.employees[0].goals[0].progress).toBe(85);

    expect(postCleanup.employees[0].reviews).toHaveLength(0);
    expect(postCleanup.employees[0].goals).toHaveLength(0);

    expect(result.goal.created.company_id).toBe('company-1');
    expect(result.participant.created.goal_id).toBe(result.goal.created.id);
  });
});
