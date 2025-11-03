/* @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardData } from '../useDashboardData';

type ProfilesRow = { employment_status: string };
type DepartmentRow = { id: string };
type ScheduleRow = { id: string; start_time: string; company_id: string | null };
type PendingTimeOffRow = { id: string; company_id: string | null };
type ApprovedTimeOffRow = { start_date: string | null; end_date: string | null; company_id: string | null };

const responses = vi.hoisted(() => ({
  profiles: [] as ProfilesRow[],
  departments: [] as DepartmentRow[],
  schedules: [] as ScheduleRow[],
  pendingTimeOff: [] as PendingTimeOffRow[],
  approvedTimeOff: [] as ApprovedTimeOffRow[],
}));

type Builder<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: Promise<T>['then'];
  catch: Promise<T>['catch'];
  finally: Promise<T>['finally'];
};

const supabaseMock = vi.hoisted(() => {
  const builders: Record<string, Builder<any>> = {};
  let nextPending = true;

  const makeBuilder = <T,>(label: string, resolver: () => T): Builder<T> => {
    const resultPromise = Promise.resolve().then(() => ({ data: resolver(), error: null }));

    const builder: Partial<Builder<T>> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.gte = vi.fn(() => builder);
    builder.lt = vi.fn(() => builder);
    builder.order = vi.fn(() => builder);
    builder.then = resultPromise.then.bind(resultPromise);
    builder.catch = resultPromise.catch.bind(resultPromise);
    builder.finally = resultPromise.finally.bind(resultPromise);

    builders[label] = builder as Builder<T>;
    return builders[label];
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
          if (nextPending) {
            nextPending = false;
            return makeBuilder('time_off_requests_pending', () => responses.pendingTimeOff);
          }
          nextPending = true;
          return makeBuilder('time_off_requests_approved', () => responses.approvedTimeOff);
        default:
          throw new Error(`Unexpected table: ${table}`);
      }
    }),
    resetTimeOffPair: () => {
      nextPending = true;
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

  beforeEach(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    responses.profiles = [{ employment_status: 'active' }];
    responses.departments = [{ id: 'dept-1' }];
    responses.schedules = [
      { id: 'schedule-tenant', start_time: now.toISOString(), company_id: 'company-123' },
      { id: 'schedule-foreign', start_time: now.toISOString(), company_id: 'other-company' },
    ];
    responses.pendingTimeOff = [
      { id: 'pending-tenant', company_id: 'company-123' },
      { id: 'pending-foreign', company_id: 'other-company' },
    ];
    responses.approvedTimeOff = [
      { start_date: now.toISOString(), end_date: tomorrow.toISOString(), company_id: 'company-123' },
      { start_date: now.toISOString(), end_date: tomorrow.toISOString(), company_id: 'other-company' },
    ];

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    supabaseMock.from.mockClear();
    supabaseMock.resetTimeOffPair();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('filters cross-tenant records from aggregated statistics', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.stats.todaysShifts).toBe(1), { timeout: 5000 });

    expect(result.current.stats.totalEmployees).toBe(1);
    expect(result.current.stats.totalDepartments).toBe(1);
    expect(result.current.stats.todaysShifts).toBe(1);
    expect(result.current.stats.pendingTimeOff).toBe(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Filtered schedules from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Filtered requested time off from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      '[useDashboardData] Filtered approved time off requests from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );

    expect(supabaseMock.builders.schedules.eq).toHaveBeenCalledWith('company_id', 'company-123');
  });

  it('returns empty stats without errors when the company has no data', async () => {
    responses.profiles = [];
    responses.departments = [];
    responses.schedules = [];
    responses.pendingTimeOff = [];
    responses.approvedTimeOff = [];

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.stats.totalEmployees).toBe(0), { timeout: 5000 });

    expect(result.current.stats.totalEmployees).toBe(0);
    expect(result.current.stats.todaysShifts).toBe(0);
    expect(result.current.error).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
