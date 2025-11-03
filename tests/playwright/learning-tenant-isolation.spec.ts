import { test, expect } from '@playwright/test';
import {
  fetchEnrollments,
  __setLearningServiceClient,
  __resetLearningServiceClient,
} from '@/services/learning/learningService';
import type { LearningEnrollment } from '@/types/learning';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

type SupabaseClient = typeof supabaseClient;

class SupabaseTableState {
  eqCalls: Array<{ column: string; value: unknown }> = [];
  orderCalls: Array<{ column: string; direction?: unknown }> = [];
}

class SupabaseMock {
  private tableData = new Map<string, any[]>();
  private tableStates = new Map<string, SupabaseTableState>();

  from(table: string) {
    const state = new SupabaseTableState();
    this.tableStates.set(table, state);

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        state.eqCalls.push({ column, value });
        return builder;
      },
      order: (column: string, direction?: unknown) => {
        state.orderCalls.push({ column, direction });
        return builder;
      },
      limit: () => builder,
      single: () => builder,
      maybeSingle: () => builder,
      then: (onFulfilled: (value: { data: any[]; error: null }) => any, onRejected?: (reason: any) => any) => {
        const rows = this.tableData.get(table) ?? [];
        const filtered = rows.filter((row) =>
          state.eqCalls.every(({ column, value }) => {
            const segments = column.split('.');
            let current: any = row;
            for (const segment of segments) {
              current = current?.[segment];
            }
            return current === value;
          }),
        );
        return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
      },
    };

    return builder;
  }

  seed(table: string, rows: any[]) {
    this.tableData.set(table, rows);
  }

  getState(table: string) {
    return this.tableStates.get(table);
  }
}

test.describe('HR enrollments tenant isolation', () => {
  const mock = new SupabaseMock();

  test.beforeEach(() => {
    mock.seed('learning_enrollments', [
      {
        id: 'enrollment-1',
        course_id: 'course-1',
        employee_id: 'employee-1',
        company_id: 'company-1',
        status: 'in_progress',
        progress_percent: 50,
        hours_completed: 2,
        current_module: 1,
        level: 1,
        started_at: '2025-01-01T00:00:00.000Z',
        completed_at: null,
        last_activity_at: '2025-01-02T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-02T00:00:00.000Z',
      },
      {
        id: 'enrollment-2',
        course_id: 'course-3',
        employee_id: 'employee-1',
        company_id: 'company-2',
        status: 'completed',
        progress_percent: 100,
        hours_completed: 2,
        current_module: 1,
        level: 1,
        started_at: '2025-01-01T00:00:00.000Z',
        completed_at: '2025-01-02T00:00:00.000Z',
        last_activity_at: '2025-01-02T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-02T00:00:00.000Z',
      },
    ]);

    __setLearningServiceClient(mock as unknown as SupabaseClient);
  });

  test.afterEach(() => {
    __resetLearningServiceClient();
  });

  test('returns only enrollments for the signed-in company', async () => {
    const results = await fetchEnrollments('employee-1', 'company-1');

    expect(Array.isArray(results)).toBe(true);
    expect((results as LearningEnrollment[]).map((item) => item.id)).toEqual(['enrollment-1']);

    const state = mock.getState('learning_enrollments');
    expect(state?.eqCalls).toEqual([
      { column: 'employee_id', value: 'employee-1' },
      { column: 'company_id', value: 'company-1' },
    ]);
  });
});
