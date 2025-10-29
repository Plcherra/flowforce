import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { buildReviewAutomationPlan } from '@/services/performance/performanceAutomation';
import type { Tables } from '@/integrations/supabase/public-types';

type ProfileRow = Pick<Tables<'profiles'>, 'id' | 'first_name' | 'last_name' | 'company_id'>;
type ReviewRow = Pick<Tables<'employee_report'>, 'id' | 'employee_id' | 'date' | 'severity' | 'notes' | 'created_by'>;

const baseEmployees: ProfileRow[] = [
  { id: 'emp-1', first_name: 'Alex', last_name: 'Rivera', company_id: 'org-1' },
  { id: 'emp-2', first_name: 'Jordan', last_name: 'Lee', company_id: 'org-1' },
  { id: 'emp-3', first_name: 'Chris', last_name: 'Nguyen', company_id: 'org-1' },
];

describe('buildReviewAutomationPlan', () => {
  it('creates coaching task and reminder when employees lack recent reviews', () => {
    const now = dayjs('2025-01-15T12:00:00Z').toDate();
    const reviews: ReviewRow[] = [
      {
        id: 'review-1',
        employee_id: 'emp-1',
        date: dayjs(now).subtract(10, 'day').format('YYYY-MM-DD'),
        severity: 2,
        notes: 'Needs help with closing checklist.',
        created_by: 'mgr-1',
      },
    ];

    const plan = buildReviewAutomationPlan({
      employees: baseEmployees,
      reviews,
      existingTasks: [],
      existingReminders: [],
      now,
    });

    expect(plan.statuses['emp-1']?.status).toBe('needs_coaching');
    expect(plan.taskTemplates).toHaveLength(1);
    expect(plan.taskTemplates[0]).toMatchObject({
      employeeId: 'emp-1',
      priority: 'high',
      dueInDays: 5,
      tags: expect.arrayContaining(['copilot', 'review', 'employee:emp-1']),
    });

    expect(plan.reminderTemplates).toHaveLength(2);
    const reminderEmployees = plan.reminderTemplates.map((template) => template.employeeId);
    expect(reminderEmployees).toEqual(expect.arrayContaining(['emp-2', 'emp-3']));
    expect(plan.reminderTemplates[0].priority).toBe('medium');
  });

  it('creates task and reminder for overdue reviews', () => {
    const now = dayjs('2025-04-01T00:00:00Z').toDate();
    const reviews: ReviewRow[] = [
      {
        id: 'review-2',
        employee_id: 'emp-2',
        date: dayjs(now).subtract(200, 'day').format('YYYY-MM-DD'),
        severity: 4,
        notes: 'Previously on track.',
        created_by: 'mgr-2',
      },
    ];

    const plan = buildReviewAutomationPlan({
      employees: baseEmployees,
      reviews,
      existingTasks: [],
      existingReminders: [],
      now,
    });

    const overdueStatus = plan.statuses['emp-2'];
    expect(overdueStatus?.status).toBe('overdue');

    const overdueTask = plan.taskTemplates.find((task) => task.employeeId === 'emp-2');
    expect(overdueTask).toBeDefined();
    expect(overdueTask?.priority).toBe('urgent');
    expect(overdueTask?.dueInDays).toBe(3);

    const overdueReminder = plan.reminderTemplates.find((reminder) => reminder.employeeId === 'emp-2');
    expect(overdueReminder).toBeDefined();
    expect(overdueReminder?.priority).toBe('high');
    expect(overdueReminder?.linkToTask).toBe(true);
  });

  it('skips automation when active tasks or reminders already exist', () => {
    const now = dayjs('2025-02-01T00:00:00Z').toDate();
    const reviews: ReviewRow[] = [
      {
        id: 'review-3',
        employee_id: 'emp-1',
        date: dayjs(now).subtract(20, 'day').format('YYYY-MM-DD'),
        severity: 2,
        notes: null,
        created_by: 'mgr-1',
      },
    ];

    const plan = buildReviewAutomationPlan({
      employees: baseEmployees,
      reviews,
      existingTasks: [
        { id: 'task-existing', employeeId: 'emp-1', status: 'in_progress' },
      ],
      existingReminders: [
        { id: 'reminder-existing', employeeId: 'emp-3', completed: false },
      ],
      now,
    });

    const taskEmployeeIds = plan.taskTemplates.map((task) => task.employeeId);
    expect(taskEmployeeIds).not.toContain('emp-1');

    const reminderEmployeeIds = plan.reminderTemplates.map((reminder) => reminder.employeeId);
    expect(reminderEmployeeIds).not.toContain('emp-3');
  });
});
