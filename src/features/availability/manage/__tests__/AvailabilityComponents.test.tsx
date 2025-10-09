import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { LockControls } from '../LockControls';
import { RequestsQueue } from '../RequestsQueue';
import { ExceptionsTable } from '../ExceptionsTable';
import type { ManagerAvailabilityRequest } from '../types';

const globalWithResizeObserver = globalThis as typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
};

beforeAll(() => {
  if (!globalWithResizeObserver.ResizeObserver) {
    globalWithResizeObserver.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe('Availability management components', () => {
  it('shows preview information in auto lock mode', () => {
    render(
      <LockControls
        mode="auto"
        day="1"
        hour="9"
        onModeChange={vi.fn()}
        onDayChange={vi.fn()}
        onHourChange={vi.fn()}
        onSave={vi.fn()}
        saving={false}
        dayOptions={[
          { value: '1', label: 'Monday' },
          { value: '2', label: 'Tuesday' },
        ]}
        hourOptions={[
          { value: '9', label: '9 AM' },
          { value: '17', label: '5 PM' },
        ]}
        lockStatePreview={{ nextLock: '2025-01-06T09:00:00Z' }}
      />,
    );

    expect(screen.getByText(/Next lock/)).toBeInTheDocument();
  });

  it('renders requests queue empty state when no items exist', () => {
    render(
      <RequestsQueue
        requests={[]}
        employees={[]}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        mutationPending={false}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/No availability requests yet/)).toBeInTheDocument();
  });

  it('allows approvers to act on pending requests', () => {
    const request: ManagerAvailabilityRequest = {
      id: 'req-1',
      employeeId: 'emp-1',
      employeeName: 'Jane Doe',
      weekStart: '2025-01-06',
      status: 'pending',
      managerId: null,
      decisionNote: null,
      createdAt: '2025-01-01T12:00:00Z',
      updatedAt: '2025-01-01T12:00:00Z',
      payload: {},
      desiredAvailability: { 0: [9, 10] },
      originalAvailability: { 0: [9] },
      requestedRange: { start: '2025-01-06', end: '2025-01-12' },
      reason: 'Needs an extra hour on Monday',
      impactScore: 1,
    };

    const handleApprove = vi.fn();

    render(
      <RequestsQueue
        requests={[request]}
        employees={[{ id: 'emp-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }]}
        onApprove={handleApprove}
        onDeny={vi.fn()}
        mutationPending={false}
        isLoading={false}
      />,
    );

    fireEvent.click(screen.getByText('Approve'));
    expect(handleApprove).toHaveBeenCalledWith(expect.objectContaining({ id: 'req-1' }));
  });

  it('renders exception empty state', () => {
    render(
      <ExceptionsTable
        employees={[]}
        exceptions={[]}
        form={{ employeeId: '', startDate: '2025-01-01', endDate: '2025-01-07', reason: '' }}
        onFormChange={() => {}}
        onSubmit={vi.fn()}
        saving={false}
        isLoading={false}
      />,
    );

    expect(screen.getByText(/No exceptions configured/)).toBeInTheDocument();
  });
});
