/* @vitest-environment jsdom */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SchedulingProvider, useScheduling } from '@/contexts/SchedulingContext';

const mocks = vi.hoisted(() => {
  const assignMock = vi.fn(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 20)));
  const unassignMock = vi.fn(() => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 20)));
  const refetchAllMock = vi.fn(() => new Promise<void>((resolve) => setTimeout(() => resolve(), 20)));

  const supabaseBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.gte = vi.fn(() => builder);
    builder.lt = vi.fn(() => Promise.resolve({ data: [], error: null }));
    builder.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
    builder.delete = vi.fn(() => builder);
    builder.insert = vi.fn(() => Promise.resolve({ data: [], error: null }));
    builder.update = vi.fn(() => Promise.resolve({ data: [], error: null }));
    builder.in = vi.fn(() => builder);
    return builder;
  };

  const supabaseMock = {
    from: vi.fn(() => supabaseBuilder()),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-user-1' } } }) },
  };

  return { assignMock, unassignMock, refetchAllMock, supabaseMock };
});

const defaultProfile = {
  userId: 'user-1',
  companyId: 'company-1',
  company_id: 'company-1',
  role: 'manager',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  employeeId: 'EMP-1',
  first_name: 'Test',
  last_name: 'User',
  locationIds: [] as string[],
};

const profileState: { profile: typeof defaultProfile | null } = {
  profile: { ...defaultProfile },
};

vi.mock('@/hooks/scheduling/useSchedulingConsolidated', () => ({
  useSchedulingConsolidated: () => ({
    shifts: [
      {
        id: 'shift-1',
        company_id: 'company-1',
        created_at: new Date().toISOString(),
        created_by: 'user-1',
        start_time: new Date('2024-01-01T09:00:00Z').toISOString(),
        end_time: new Date('2024-01-01T17:00:00Z').toISOString(),
        title: 'Morning Shift',
        role: 'Supervisor',
        color: '#2563eb',
        location: 'Main',
        notes: null,
        break_minutes: null,
        hourly_rate: null,
        is_all_day: false,
        is_published: false,
        is_template: false,
        template_id: null,
        position_id: null,
        status: 'scheduled',
        timezone: 'UTC',
        user_id: null,
        assignments: [],
        requirements: null,
        updated_at: new Date().toISOString(),
      },
    ],
    assignments: [],
    timeOffRequests: [],
    unavailability: [],
    vendorEvents: [],
    teamMembers: [],
    loading: false,
    error: null,
    refetchAll: mocks.refetchAllMock,
    assign: mocks.assignMock,
    unassign: mocks.unassignMock,
    upsertShift: vi.fn(),
    upsertVendorEvent: vi.fn(),
    isUsingFallbackData: false,
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: profileState.profile,
    loading: false,
    error: null,
    refreshProfile: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'auth-user-1' }, loading: false }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mocks.supabaseMock,
}));

function TestHarness() {
  const { shifts, mutations } = useScheduling();
  return (
    <div>
      <div data-testid="shift-count">{shifts.length}</div>
      <button data-testid="assign" onClick={() => mutations.assign('shift-1', 'user-100')}>assign</button>
      <button data-testid="unassign" onClick={() => mutations.unassign('shift-1', 'user-100')}>unassign</button>
    </div>
  );
}

describe('SchedulingContext mutations passthrough', () => {
  beforeEach(() => {
    profileState.profile = { ...defaultProfile };
    mocks.assignMock.mockClear();
    mocks.unassignMock.mockClear();
    mocks.refetchAllMock.mockClear();
    mocks.supabaseMock.from.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  test('assign/unassign delegates to consolidated hook', async () => {
    render(
      <SchedulingProvider>
        <TestHarness />
      </SchedulingProvider>
    );

    expect(screen.getByTestId('shift-count').textContent).toBe('1');

    fireEvent.click(screen.getByTestId('assign'));
    await waitFor(() =>
      expect(mocks.assignMock).toHaveBeenCalledWith('shift-1', 'user-100', 'assigned'),
    );

    fireEvent.click(screen.getByTestId('unassign'));

    await waitFor(() => expect(mocks.unassignMock).toHaveBeenCalledWith('shift-1', 'user-100'));
  });

  test('clearWeek scopes deletions to the active company', async () => {
    const onResult = vi.fn();

    render(
      <SchedulingProvider>
        <ClearWeekHarness onResult={onResult} />
      </SchedulingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('clear-week'));
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));

    expect(mocks.supabaseMock.from).toHaveBeenNthCalledWith(1, 'schedules');
    expect(mocks.supabaseMock.from).toHaveBeenNthCalledWith(2, 'vendor_event');

    const schedulesBuilder: any = mocks.supabaseMock.from.mock.results[0]?.value;
    const vendorBuilder: any = mocks.supabaseMock.from.mock.results[1]?.value;

    expect(schedulesBuilder?.eq).toHaveBeenCalledWith('company_id', 'company-1');
    expect(vendorBuilder?.eq).toHaveBeenCalledWith('company_id', 'company-1');
  });

  test('clearWeek short-circuits when company context is missing', async () => {
    profileState.profile = null;
    const onResult = vi.fn();

    render(
      <SchedulingProvider>
        <ClearWeekHarness onResult={onResult} />
      </SchedulingProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('clear-week'));
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    expect(mocks.supabaseMock.from).not.toHaveBeenCalled();
  });
});

function ClearWeekHarness({ onResult }: { onResult: (result: boolean) => void }) {
  const { mutations } = useScheduling();
  return (
    <button
      data-testid="clear-week"
      onClick={async () => {
        const result = await mutations.clearWeek({
          weekStart: '2024-01-01T00:00:00.000Z',
          weekEnd: '2024-01-08T00:00:00.000Z',
        });
        onResult(result);
      }}
    >
      clear-week
    </button>
  );
}
