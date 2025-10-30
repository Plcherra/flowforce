/* @vitest-environment jsdom */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SchedulingProvider, useScheduling } from '@/contexts/SchedulingContext';

const insertMocks = vi.hoisted(() => ({
  unavailabilityInsert: vi.fn(async () => ({ error: null })),
  timeOffInsert: vi.fn(async () => ({ error: null })),
}));

const refetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/scheduling/useSchedulingConsolidated', () => ({
  useSchedulingConsolidated: () => ({
    shifts: [],
    assignments: [],
    timeOffRequests: [],
    unavailability: [],
    vendorEvents: [],
    teamMembers: [
      { id: 'member-1', first_name: 'Alex', last_name: 'Rivera', email: 'alex@example.com', avatar_url: null },
    ],
    loading: false,
    error: null,
    refetchAll: refetchMock,
    assign: vi.fn(),
    unassign: vi.fn(),
    upsertShift: vi.fn(),
    upsertVendorEvent: vi.fn(),
    isUsingFallbackData: false,
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      companyId: 'company-123',
      userId: 'user-1',
      role: 'manager',
    },
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'user_unavailability') {
        return {
          insert: insertMocks.unavailabilityInsert,
        };
      }
      if (table === 'time_off_requests') {
        return {
          insert: insertMocks.timeOffInsert,
        };
      }
      throw new Error(`Unexpected table access: ${table}`);
    }),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => <SchedulingProvider>{children}</SchedulingProvider>;

describe('SchedulingContext', () => {
  beforeEach(() => {
    insertMocks.unavailabilityInsert.mockClear();
    insertMocks.timeOffInsert.mockClear();
    refetchMock.mockClear();
    toastSpy.mockClear();
  });

  it('rejects unavailability writes for non-company users', async () => {
    const { result } = renderHook(() => useScheduling(), { wrapper });

    await act(async () => {
      const success = await result.current.mutations.addUnavailability({
        userId: 'external-user',
        start: '2024-01-01T09:00:00Z',
        end: '2024-01-01T17:00:00Z',
      });
      expect(success).toBe(false);
    });

    expect(insertMocks.unavailabilityInsert).not.toHaveBeenCalled();
    expect(toastSpy).toHaveBeenCalled();
  });

  it('allows time off requests for company members', async () => {
    const { result } = renderHook(() => useScheduling(), { wrapper });

    await act(async () => {
      const success = await result.current.mutations.requestTimeOff({
        userId: 'member-1',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        type: 'vacation',
      });
      expect(success).toBe(true);
    });

    expect(insertMocks.timeOffInsert).toHaveBeenCalledWith({
      user_id: 'member-1',
      start_date: '2024-02-01',
      end_date: '2024-02-05',
      type: 'vacation',
      reason: 'time off',
      status: 'pending',
      notes: null,
      approved_by: null,
      approved_at: null,
    });
    expect(refetchMock).toHaveBeenCalled();
  });
});
