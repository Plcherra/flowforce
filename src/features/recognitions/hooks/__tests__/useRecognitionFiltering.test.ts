import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecognitionFiltering } from '../useRecognitionFiltering';
import type { RecognitionRecord } from '@/types/recognition';
import type { Employee } from '@/features/employees/hooks/useEmployees';

const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    first_name: 'Alex',
    last_name: 'Ng',
    email: 'alex@example.com',
    avatar_url: undefined,
    role: 'agent',
    employment_status: 'active',
    department_id: 'dept-sales',
    department: { id: 'dept-sales', name: 'Sales', color: undefined },
    position: undefined,
    skillLevel: undefined,
    skillXp: undefined,
    badges: [],
    reliability: undefined,
    positiveReportCount: undefined,
    lateCount: undefined,
    noShowCount: undefined,
  },
  {
    id: 'emp-2',
    first_name: 'Blair',
    last_name: 'Ray',
    email: 'blair@example.com',
    avatar_url: undefined,
    role: 'agent',
    employment_status: 'active',
    department_id: 'dept-support',
    department: { id: 'dept-support', name: 'Support', color: undefined },
    position: undefined,
    skillLevel: undefined,
    skillXp: undefined,
    badges: [],
    reliability: undefined,
    positiveReportCount: undefined,
    lateCount: undefined,
    noShowCount: undefined,
  },
];

const now = new Date().toISOString();
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

const mockRecognitions: RecognitionRecord[] = [
  {
    id: 'rec-1',
    goal_id: null,
    user_id: 'emp-1',
    reward_type: 'recognition',
    reward_details: {
      source: 'task_completion',
      message: 'Closed quarterly renewal',
    },
    awarded_at: now,
    created_by: 'system',
    award_rule: null,
    goal: null,
    recipient: { id: 'emp-1', first_name: 'Alex', last_name: 'Ng', avatar_url: undefined, position_id: undefined },
    creator: { id: 'system', first_name: 'System', last_name: 'Bot', avatar_url: undefined },
    milestone: null,
    task: null,
    training: null,
  },
  {
    id: 'rec-2',
    goal_id: null,
    user_id: 'emp-2',
    reward_type: 'recognition',
    reward_details: {
      source: 'training_completion',
      message: 'Finished onboarding module',
    },
    awarded_at: ninetyDaysAgo,
    created_by: 'system',
    award_rule: null,
    goal: null,
    recipient: { id: 'emp-2', first_name: 'Blair', last_name: 'Ray', avatar_url: undefined, position_id: undefined },
    creator: { id: 'system', first_name: 'System', last_name: 'Bot', avatar_url: undefined },
    milestone: null,
    task: null,
    training: null,
  },
];

describe('useRecognitionFiltering', () => {
  it('filters by department and timeline', () => {
    const { result } = renderHook(() =>
      useRecognitionFiltering({
        recognitions: mockRecognitions,
        employees: mockEmployees,
        departmentFilter: 'dept-sales',
        searchTerm: '',
        timelineFilter: '30',
        sourceFilter: undefined,
      }),
    );

    expect(result.current.departmentOptions).toEqual([
      ['dept-sales', 'Sales'],
      ['dept-support', 'Support'],
    ]);
    expect(result.current.filteredRecognitions).toHaveLength(1);
    expect(result.current.filteredRecognitions[0].id).toBe('rec-1');
  });

  it('searches across recipient and message fields', () => {
    const { result } = renderHook(() =>
      useRecognitionFiltering({
        recognitions: mockRecognitions,
        employees: mockEmployees,
        departmentFilter: 'all',
        searchTerm: 'onboarding',
        timelineFilter: 'all',
        sourceFilter: undefined,
      }),
    );

    expect(result.current.filteredRecognitions).toHaveLength(1);
    expect(result.current.filteredRecognitions[0].id).toBe('rec-2');
  });

  it('computes stats for filtered set', () => {
    const { result } = renderHook(() =>
      useRecognitionFiltering({
        recognitions: mockRecognitions,
        employees: mockEmployees,
        departmentFilter: 'all',
        searchTerm: '',
        timelineFilter: 'all',
        sourceFilter: undefined,
      }),
    );

    expect(result.current.stats).toEqual({
      total: 2,
      goals: 0,
      tasks: 1,
      training: 1,
      manual: 0,
    });
  });
});
