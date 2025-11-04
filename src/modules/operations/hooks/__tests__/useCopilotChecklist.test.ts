import { describe, expect, it } from 'vitest';
import {
  generateChecklistPlan,
  type ChecklistPlanInput,
} from '@/modules/operations/hooks/useCopilotChecklist';

describe('generateChecklistPlan', () => {
  const baseInput: Omit<ChecklistPlanInput, 'checklists' | 'existingTasks' | 'supervisors'> = {
    day: '2024-03-05',
    storeId: 'store-1',
    employeeNames: new Map([
      ['sup-1', 'Alex Supervisor'],
      ['sup-2', 'Jamie Supervisor'],
    ]),
    companyId: 'company-1',
  };

  it('creates missing default tasks and assigns supervisors in rotation', () => {
    const plan = generateChecklistPlan({
      ...baseInput,
      checklists: [
        {
          id: 'chk-1',
          name: 'Daily Ops',
          recurrence: 'daily',
          default_tasks: [
            { title: 'Inventory Count', role: 'supervisor' },
            { title: 'Floor Walk', role: 'supervisor' },
          ],
        },
      ],
      existingTasks: [],
      supervisors: [
        { employeeId: 'sup-1', employeeName: 'Alex Supervisor' },
        { employeeId: 'sup-2', employeeName: 'Jamie Supervisor' },
      ],
    });

    expect(plan.creations).toHaveLength(2);
    expect(plan.creations[0].payload.assigned_to).toBe('sup-1');
    expect(plan.creations[1].payload.assigned_to).toBe('sup-2');
    expect(plan.assignmentEvents).toHaveLength(2);
    expect(plan.assignmentEvents.every((event) => event.type === 'created')).toBe(true);
  });

  it('avoids duplicate creations when tasks already exist', () => {
    const plan = generateChecklistPlan({
      ...baseInput,
      checklists: [
        {
          id: 'chk-1',
          name: 'Daily Ops',
          recurrence: 'daily',
          default_tasks: [{ title: 'Inventory Count', role: 'supervisor' }],
        },
      ],
      supervisors: [{ employeeId: 'sup-1', employeeName: 'Alex Supervisor' }],
      existingTasks: [
        {
          id: 'task-1',
          checklist_id: 'chk-1',
          assigned_to: 'sup-1',
          store_id: 'store-1',
          day: '2024-03-05',
          status: 'pending',
          metadata: { defaultTitle: 'Inventory Count' },
        },
      ],
    });

    expect(plan.creations).toHaveLength(0);
    expect(plan.updates).toHaveLength(0);
  });

  it('generates assignment updates when existing tasks lack assignees', () => {
    const plan = generateChecklistPlan({
      ...baseInput,
      checklists: [
        {
          id: 'chk-1',
          name: 'Daily Ops',
          recurrence: 'daily',
          default_tasks: [{ title: 'Inventory Count', role: 'supervisor' }],
        },
      ],
      supervisors: [{ employeeId: 'sup-1', employeeName: 'Alex Supervisor' }],
      existingTasks: [
        {
          id: 'task-1',
          checklist_id: 'chk-1',
          assigned_to: null,
          store_id: 'store-1',
          day: '2024-03-05',
          status: 'pending',
          metadata: { defaultTitle: 'Inventory Count' },
        },
      ],
    });

    expect(plan.creations).toHaveLength(0);
    expect(plan.updates).toEqual([
      {
        id: 'task-1',
        assigned_to: 'sup-1',
        checklistId: 'chk-1',
        title: 'Inventory Count',
        assigneeName: 'Alex Supervisor',
      },
    ]);
    expect(plan.assignmentEvents).toHaveLength(1);
    expect(plan.assignmentEvents[0]).toMatchObject({ type: 'updated', taskId: 'task-1' });
  });

  it('creates tasks without assignment when no supervisors available', () => {
    const plan = generateChecklistPlan({
      ...baseInput,
      checklists: [
        {
          id: 'chk-1',
          name: 'Daily Ops',
          recurrence: 'daily',
          default_tasks: [{ title: 'Inventory Count', role: 'supervisor' }],
        },
      ],
      supervisors: [],
      existingTasks: [],
    });

    expect(plan.creations).toHaveLength(1);
    expect(plan.creations[0].payload.assigned_to).toBeNull();
    expect(plan.assignmentEvents).toHaveLength(0);
  });
});
