import { describe, expect, it } from 'vitest';
import { mapToLeaderboardEntry } from './useLeaderboardData';
import type { Employee } from '@/features/employees/hooks/useEmployees';

describe('mapToLeaderboardEntry', () => {
  it('builds leaderboard entry from Supabase row when employee cache misses', () => {
    const row: any = {
      employee_id: 'emp-123',
      department_id: 'dept-row',
      role: 'lead',
      period: 'monthly',
      period_start: '2025-01-01',
      xp_total: 500,
      xp_tasks: 200,
      xp_goals: 150,
      xp_recognitions: 100,
      xp_training: 50,
      badge_tier: 'Gold',
      badge_codes: ['task_streak'],
      achievements: [
        { code: 'task_streak', value: 4 },
        { code: 'goal_closer', value: 2 },
        { code: 'recognition_star', value: 5 },
        { code: 'skills_in_motion', value: 3 },
      ],
      insights: [],
      challenges: [
        {
          employeeId: 'emp-123',
          focus: 'skills',
          title: 'Sharpen React skills',
          description: 'Targeted React practice for upcoming sprint',
          reward: 'Double XP',
          confidence: 0.8,
          period: 'monthly',
          periodStart: '2025-01-01',
        },
      ],
      updated_at: '2025-01-05T00:00:00Z',
      last_synced_at: '2025-01-05T00:00:00Z',
      employee: {
        id: 'emp-123',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        avatar_url: 'https://example.com/avatar.png',
        role: 'developer',
        department: {
          id: 'dept-123',
          name: 'Engineering',
        },
        position: {
          name: 'Engineer',
        },
      },
    };

    const entry = mapToLeaderboardEntry(row, 0, undefined);

    expect(entry).not.toBeNull();
    expect(entry?.employeeId).toBe('emp-123');
    expect(entry?.fullName).toBe('Ada Lovelace');
    expect(entry?.email).toBe('ada@example.com');
    expect(entry?.avatarUrl).toBe('https://example.com/avatar.png');
    expect(entry?.role).toBe('lead');
    expect(entry?.department).toEqual({ id: 'dept-row', name: 'Engineering' });
    expect(entry?.positionName).toBe('Engineer');
    expect(entry?.xp.total).toBe(500);
    expect(entry?.taskCount).toBe(4);
    expect(entry?.goalCount).toBe(2);
    expect(entry?.recognitionCount).toBe(5);
    expect(entry?.trainingCount).toBe(3);
    expect(entry?.rank).toBe(1);
  });

  it('prioritises cached employee metadata when available', () => {
    const row: any = {
      employee_id: 'emp-456',
      department_id: null,
      role: 'admin',
      period: 'weekly',
      period_start: '2025-01-06',
      xp_total: 250,
      xp_tasks: 100,
      xp_goals: 60,
      xp_recognitions: 40,
      xp_training: 50,
      badge_tier: 'Silver',
      badge_codes: [],
      achievements: [],
      insights: [],
      challenges: [],
      updated_at: null,
      last_synced_at: '2025-01-06T00:00:00Z',
    };

    const employee: Employee = {
      id: 'emp-456',
      first_name: 'Cache',
      last_name: 'Hero',
      email: 'cache@example.com',
      avatar_url: 'https://example.com/cache.png',
      role: 'coach',
      employment_status: 'active',
      department_id: 'dept-2',
      department: {
        id: 'dept-2',
        name: 'Operations',
        color: null,
      },
      position: {
        id: 'pos-1',
        name: 'Operator',
        role: 'operations',
      },
      skillLevel: 3,
      skillXp: 120,
      badges: ['badge1'],
      reliability: 95,
      positiveReportCount: 2,
      lateCount: 1,
      noShowCount: 0,
    };

    const entry = mapToLeaderboardEntry(row, 2, employee);

    expect(entry).not.toBeNull();
    expect(entry?.fullName).toBe('Cache Hero');
    expect(entry?.email).toBe('cache@example.com');
    expect(entry?.avatarUrl).toBe('https://example.com/cache.png');
    expect(entry?.role).toBe('admin');
    expect(entry?.department).toEqual({ id: 'dept-2', name: 'Operations' });
    expect(entry?.positionName).toBe('Operator');
    expect(entry?.reliability).toBe(95);
    expect(entry?.rank).toBe(3);
  });
});
