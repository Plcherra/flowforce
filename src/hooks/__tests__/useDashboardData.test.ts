/* @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardData } from '../useDashboardData';

type ProfilesRow = { id: string; employment_status: string; department_id: string | null };
type DepartmentRow = { id: string };
type ScheduleRow = {
  id: string;
  start_time: string;
  end_time: string | null;
  company_id: string | null;
  user_id: string | null;
  status: string | null;
};
type TimeOffRequestRow = {
  id: string;
  user_id: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
};

const responses = vi.hoisted(() => ({
  profiles: [] as ProfilesRow[],
  departments: [] as DepartmentRow[],
  schedules: [] as ScheduleRow[],
  timeOffRequests: [] as TimeOffRequestRow[],
}));

type Builder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  then: Promise<T>['then'];
  catch: Promise<T>['catch'];
  finally: Promise<T>['finally'];
};

const supabaseMock = vi.hoisted(() => {
  const builders: Record<string, Builder<any>> = {};
  const errors: Record<string, { message: string; code?: string } | null> = {
    profiles: null,
    schedules: null,
    departments: null,
    time_off_requests: null,
  };

  const makeBuilder = <T,>(label: keyof typeof errors, resolver: () => T): Builder<T> => {
    const resultPromise = Promise.resolve().then(() => ({ data: resolver(), error: errors[label] }));
    const builder: Partial<Builder<T>> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.gte = vi.fn(() => builder);
    builder.lte = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.then = resultPromise.then.bind(resultPromise);
    builder.catch = resultPromise.catch.bind(resultPromise);
    builder.finally = resultPromise.finally.bind(resultPromise);
    builders[String(label)] = builder as Builder<T>;
    return builders[String(label)];
  };

  return {
    builders,
    from: vi.fn((table: string) => {
      switch (table) {
        case 'profiles':
          return makeBuilder('profiles', () => responses.profiles);
        case 'departments':
          return makeBuilder('departments', () => responses.departments);
        case 'schedules':
          return makeBuilder('schedules', () => responses.schedules);
        case 'time_off_requests':
          return makeBuilder('time_off_requests', () => responses.timeOffRequests);
        default:
          throw new Error(`Unexpected table: ${table}`);
      }
    }),
    setError: (label: keyof typeof errors, error: { message: string; code?: string } | null) => {
      errors[label] = error;
    },
    resetErrors: () => {
      (Object.keys(errors) as Array<keyof typeof errors>).forEach((key) => {
        errors[key] = null;
      });
    },
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      companyId: 'company-123',
    },
  }),
}));

describe('useDashboardData', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

  beforeEach(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    responses.profiles = [
      { id: 'emp-1', employment_status: 'active', department_id: 'dept-1' },
      { id: 'emp-2', employment_status: 'inactive', department_id: null },
    ];
    responses.departments = [{ id: 'dept-1' }];
    responses.schedules = [
      {
        id: 'schedule-tenant',
        start_time: now.toISOString(),
        end_time: addHours(now, 4).toISOString(),
        company_id: 'company-123',
        user_id: 'emp-1',
        status: 'published',
      },
      {
        id: 'schedule-tenant-week',
        start_time: tomorrow.toISOString(),
        end_time: addHours(tomorrow, 4).toISOString(),
        company_id: 'company-123',
        user_id: 'emp-1',
        status: 'draft',
      },
      {
        id: 'schedule-foreign',
        start_time: now.toISOString(),
        end_time: addHours(now, 6).toISOString(),
        company_id: 'other-company',
        user_id: 'foreign',
        status: 'published',
      },
    ];
    responses.timeOffRequests = [
      {
        id: 'request-tenant',
        user_id: 'emp-1',
        status: 'requested',
        start_date: now.toISOString().split('T')[0],
        end_date: tomorrow.toISOString().split('T')[0],
      },
      {
        id: 'approved-tenant',
        user_id: 'emp-1',
        status: 'approved',
        start_date: now.toISOString().split('T')[0],
        end_date: dayAfter.toISOString().split('T')[0],
      },
      {
        id: 'approved-foreign',
        user_id: 'other-emp',
        status: 'approved',
        start_date: now.toISOString().split('T')[0],
        end_date: dayAfter.toISOString().split('T')[0],
      },
    ];

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    supabaseMock.from.mockClear();
    supabaseMock.resetErrors();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('filters cross-tenant records and computes statistics with heuristics', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.stats.todaysShifts).toBeGreaterThan(0), { timeout: 3000 });

    expect(result.current.stats.totalEmployees).toBe(2);
    expect(result.current.stats.activeEmployees).toBe(1);
    expect(result.current.stats.totalDepartments).toBe(1);
    expect(result.current.stats.todaysShifts).toBe(1);
    expect(result.current.stats.pendingTimeOff).toBe(1);
    expect(result.current.stats.approvedTimeOffUpcoming).toBe(1);
    expect(result.current.stats.timeOffDaysUsed).toBe(3);
    expect(result.current.stats.coverageCompleteness).toBe(40);
    expect(result.current.stats.hoursUtilization).toBe(20);
    expect(result.current.stats.taskCompletion).toBe(100);
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Filtered schedules from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Filtered time off entries from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );
    expect(supabaseMock.builders.schedules.eq).toHaveBeenCalledWith('company_id', 'company-123');
  });

  it('derives department counts when the schema lacks company scoping', async () => {
    supabaseMock.setError('departments', { message: 'column departments.company_id does not exist', code: '42703' });
    responses.profiles = [
      { id: 'emp-1', employment_status: 'active', department_id: 'dept-1' },
      { id: 'emp-2', employment_status: 'active', department_id: 'dept-2' },
    ];
    responses.departments = [];

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.stats.totalDepartments).toBe(2));

    expect(result.current.stats.totalDepartments).toBe(2);
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Departments table missing company scope, using derived counts',
      { companyId: 'company-123', fallback: 2 },
    );
  });
});
