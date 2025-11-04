/* @vitest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShiftsForDate } from '../useShiftsForDate';

const shifts = [
  {
    id: 'shift-1',
    start_time: '2024-01-02T09:00:00',
    end_time: '2024-01-02T17:00:00',
    location: 'Store One',
    color: '#3b82f6',
    is_published: true,
    assignments: [
      {
        id: 'assign-1',
        user_id: 'user-1',
        user: {
          id: 'user-1',
          first_name: 'Alex',
          last_name: 'Taylor',
          email: 'alex@example.com',
          avatar_url: null,
        },
      },
      {
        id: 'assign-2',
        user_id: 'user-2',
        user: {
          id: 'user-2',
          first_name: 'Jordan',
          last_name: 'Lee',
          email: 'jordan@example.com',
          avatar_url: null,
        },
      },
    ],
    job_position: { name: 'Barista' },
    requirements: { store_id: 'store-1' },
  },
  {
    id: 'shift-2',
    start_time: '2024-01-02T12:00:00',
    end_time: '2024-01-02T18:00:00',
    location: 'Store Two',
    color: '#10b981',
    is_published: true,
    assignments: [
      {
        id: 'assign-3',
        user_id: 'user-1',
        user: {
          id: 'user-1',
          first_name: 'Alex',
          last_name: 'Taylor',
          email: 'alex@example.com',
          avatar_url: null,
        },
      },
    ],
    job_position: { name: 'Supervisor' },
    requirements: { store_id: 'store-2' },
  },
];

vi.mock('@/contexts/SchedulingContext', () => ({
  useScheduling: () => ({
    shifts,
    loading: false,
  }),
}));

describe('useShiftsForDate', () => {
  it('returns shifts and aggregated staff for the given date', () => {
    const { result } = renderHook(() => useShiftsForDate('2024-01-02T00:00:00'));

    expect(result.current.loading).toBe(false);
    expect(result.current.shifts).toHaveLength(2);
    expect(result.current.staff).toHaveLength(2);

    const alex = result.current.staff.find((staff) => staff.id === 'user-1');
    expect(alex).toBeDefined();
    expect(new Set(alex?.shiftIds ?? [])).toEqual(new Set(['shift-1', 'shift-2']));
  });

  it('filters shifts by store identifier when provided', () => {
    const { result, rerender } = renderHook(({ storeId }) => useShiftsForDate('2024-01-02T00:00:00', storeId), {
      initialProps: { storeId: 'store-1' },
    });

    expect(result.current.shifts).toHaveLength(1);
    expect(result.current.staff).toHaveLength(2);

    rerender({ storeId: 'store-2' });
    expect(result.current.shifts).toHaveLength(1);
    expect(result.current.staff).toHaveLength(1);
    expect(result.current.staff[0]?.shiftIds).toEqual(['shift-2']);
  });
});
