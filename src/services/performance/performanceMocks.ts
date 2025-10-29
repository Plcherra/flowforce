import dayjs from 'dayjs';
import {
  performanceReviewStatusSchema,
  goalStatusSchema,
  type PerformanceDataset,
  type EmployeePerformance,
} from './performanceTypes';

function normalizeMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildEmployees(): EmployeePerformance[] {
  const team: EmployeePerformance[] = [
    {
      id: 'emp-performance-1',
      firstName: 'Ava',
      lastName: 'Santos',
      role: 'Store Manager',
      avatarUrl: null,
      metrics: {
        performanceScore: normalizeMetric(92),
        goalProgress: normalizeMetric(84),
        attendanceReliability: normalizeMetric(96),
        reviewHealth: normalizeMetric(90),
      },
      goals: [
        {
          id: 'goal-1',
          title: 'Improve customer satisfaction scores',
          status: goalStatusSchema.parse('active'),
          progress: 82,
          createdAt: dayjs().subtract(45, 'day').toISOString(),
          targetCompletionDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
          participantRole: 'owner',
          contributionScore: 85,
        },
        {
          id: 'goal-2',
          title: 'Launch mentorship program',
          status: goalStatusSchema.parse('draft'),
          progress: 45,
          createdAt: dayjs().subtract(12, 'day').toISOString(),
          targetCompletionDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
          participantRole: 'participant',
          contributionScore: 65,
        },
      ],
      reviews: [
        {
          id: 'review-ava-1',
          date: dayjs().subtract(25, 'day').format('YYYY-MM-DD'),
          severity: 5,
          notes: 'Exceeded targets and coached peers on new POS workflow.',
          reviewerId: 'mgr-ops-1',
          status: performanceReviewStatusSchema.parse('on_track'),
        },
      ],
      latestReviewStatus: performanceReviewStatusSchema.parse('on_track'),
      latestReviewDate: dayjs().subtract(25, 'day').format('YYYY-MM-DD'),
    },
    {
      id: 'emp-performance-2',
      firstName: 'Noah',
      lastName: 'Garcia',
      role: 'Shift Lead',
      avatarUrl: null,
      metrics: {
        performanceScore: normalizeMetric(78),
        goalProgress: normalizeMetric(68),
        attendanceReliability: normalizeMetric(88),
        reviewHealth: normalizeMetric(72),
      },
      goals: [
        {
          id: 'goal-3',
          title: 'Reduce waste in evening shifts',
          status: goalStatusSchema.parse('active'),
          progress: 64,
          createdAt: dayjs().subtract(28, 'day').toISOString(),
          targetCompletionDate: dayjs().add(45, 'day').format('YYYY-MM-DD'),
          participantRole: 'owner',
          contributionScore: 72,
        },
      ],
      reviews: [
        {
          id: 'review-noah-1',
          date: dayjs().subtract(95, 'day').format('YYYY-MM-DD'),
          severity: 3,
          notes: 'Solid progress, needs to tighten shift hand-off documentation.',
          reviewerId: 'mgr-ops-1',
          status: performanceReviewStatusSchema.parse('due_soon'),
        },
      ],
      latestReviewStatus: performanceReviewStatusSchema.parse('due_soon'),
      latestReviewDate: dayjs().subtract(95, 'day').format('YYYY-MM-DD'),
    },
    {
      id: 'emp-performance-3',
      firstName: 'Lena',
      lastName: 'Zimmer',
      role: 'Barista',
      avatarUrl: null,
      metrics: {
        performanceScore: normalizeMetric(70),
        goalProgress: normalizeMetric(58),
        attendanceReliability: normalizeMetric(82),
        reviewHealth: normalizeMetric(66),
      },
      goals: [
        {
          id: 'goal-4',
          title: 'Complete advanced beverage certification',
          status: goalStatusSchema.parse('active'),
          progress: 55,
          createdAt: dayjs().subtract(18, 'day').toISOString(),
          targetCompletionDate: dayjs().add(20, 'day').format('YYYY-MM-DD'),
          participantRole: 'participant',
          contributionScore: 60,
        },
        {
          id: 'goal-5',
          title: 'Lead two weekend catering events',
          status: goalStatusSchema.parse('completed'),
          progress: 100,
          createdAt: dayjs().subtract(75, 'day').toISOString(),
          targetCompletionDate: dayjs().subtract(10, 'day').format('YYYY-MM-DD'),
          participantRole: 'owner',
          contributionScore: 95,
        },
      ],
      reviews: [
        {
          id: 'review-lena-1',
          date: dayjs().subtract(32, 'day').format('YYYY-MM-DD'),
          severity: 2,
          notes: 'Needs coaching on rush-hour throughput. Attendance improving.',
          reviewerId: 'mgr-ops-2',
          status: performanceReviewStatusSchema.parse('needs_coaching'),
        },
      ],
      latestReviewStatus: performanceReviewStatusSchema.parse('needs_coaching'),
      latestReviewDate: dayjs().subtract(32, 'day').format('YYYY-MM-DD'),
    },
  ];

  return team;
}

export function generateMockPerformanceDataset(): PerformanceDataset {
  const employees = buildEmployees();
  const allGoals = employees.flatMap((employee) => employee.goals);

  const goalSummary = {
    total: allGoals.length,
    active: allGoals.filter((goal) => goal.status === 'active').length,
    completed: allGoals.filter((goal) => goal.status === 'completed').length,
    averageProgress: allGoals.length
      ? Math.round(
          allGoals.reduce((sum, goal) => sum + goal.progress, 0) / allGoals.length,
        )
      : 0,
  };

  const averageMetric = (metric: keyof EmployeePerformance['metrics']) => {
    if (!employees.length) return 0;
    const total = employees.reduce((sum, employee) => sum + employee.metrics[metric], 0);
    return Math.round(total / employees.length);
  };

  const radar = [
    {
      metric: 'Performance Score',
      actual: averageMetric('performanceScore'),
      target: 90,
      fullMark: 100,
    },
    {
      metric: 'Goal Progress',
      actual: averageMetric('goalProgress'),
      target: 85,
      fullMark: 100,
    },
    {
      metric: 'Attendance',
      actual: averageMetric('attendanceReliability'),
      target: 90,
      fullMark: 100,
    },
    {
      metric: 'Review Health',
      actual: averageMetric('reviewHealth'),
      target: 95,
      fullMark: 100,
    },
  ];

  return {
    employees,
    goalSummary,
    radar,
  };
}
