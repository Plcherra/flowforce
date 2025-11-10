import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LearningCenter from '../LearningCenter';
import { useLearningCenter } from '@/hooks/learning/useLearningCenter';

vi.mock('@/hooks/learning/useLearningCenter', () => ({
  useLearningCenter: vi.fn(),
}));

const mockHook = vi.mocked(useLearningCenter);

const baseHookResult = {
  loading: false,
  saving: false,
  error: null,
  trainingAdmin: false,
  catalog: [],
  catalogByCategory: new Map(),
  enrollments: [],
  adminEnrollments: [],
  courseById: new Map(),
  metrics: [],
  totalMetrics: {
    totalCourses: 0,
    totalCompletions: 0,
    totalActiveLearners: 0,
    totalHours: 0,
    totalXp: 0,
    averageProgress: 0,
  },
  snapshot: null,
  recommendations: [],
  progressByEnrollment: {},
  progressSnapshotsByEnrollment: {},
  progressEventCursors: {},
  progressSnapshotCursors: {},
  trainingInsights: null,
  refresh: vi.fn(),
  handleCreateCourse: vi.fn(),
  handleEnroll: vi.fn(),
  handleModuleCompletion: vi.fn(),
  getCourseWorkload: vi.fn(),
  loadMoreProgress: vi.fn(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <LearningCenter />
    </MemoryRouter>,
  );

describe('LearningCenter page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHook.mockReturnValue(baseHookResult);
  });

  it('disables refresh button while loading snapshot', () => {
    mockHook.mockReturnValue({
      ...baseHookResult,
      loading: true,
      snapshot: null,
    });

    renderPage();

    expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled();
  });

  it('shows catalog empty state when no courses exist', async () => {
    mockHook.mockReturnValue({
      ...baseHookResult,
      loading: false,
      catalog: [],
    });

    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /catalog/i }));
    expect(screen.getByText('No courses in the catalog')).toBeInTheDocument();
  });
});
