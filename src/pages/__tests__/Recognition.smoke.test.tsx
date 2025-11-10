import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { RecognitionRecord } from '@/types/recognition';
import type { Employee } from '@/features/employees/hooks/useEmployees';
import type { LeaderboardInsightRecord } from '@/stores/useLeaderboardInsights';
import Recognition from '../Recognition';

const mockUseRecognitions = vi.fn();
const mockUseEmployees = vi.fn();
const mockUseToast = vi.fn();
const mockUseLeaderboardData = vi.fn();

vi.mock('@/hooks/useRecognitions', () => ({
  useRecognitions: () => mockUseRecognitions(),
}));

vi.mock('@/features/employees/hooks/useEmployees', () => ({
  useEmployees: () => mockUseEmployees(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => mockUseToast(),
}));

vi.mock('@/features/leaderboard/useLeaderboardData', () => ({
  useLeaderboardData: () => mockUseLeaderboardData(),
}));

vi.mock('@/stores/useLeaderboardInsights', () => ({
  useLeaderboardInsightsStore:
    (
      selector: (state: { insights: LeaderboardInsightRecord[]; lastUpdated: string | null }) => unknown,
    ) => selector({ insights: [], lastUpdated: null }),
}));

const baseEmployeesHook = {
  employees: [] as Employee[],
  loading: false,
  error: null as string | null,
};

const baseLeaderboardHook = {
  loading: false,
  syncing: false,
  error: null as string | null,
  refresh: vi.fn(),
};

const sampleEmployee: Employee = {
  id: 'emp-1',
  first_name: 'Ava',
  last_name: 'Ng',
  email: 'ava@example.com',
  avatar_url: undefined,
  role: 'agent',
  employment_status: 'active',
  department_id: null,
  department: null,
  position: undefined,
  skillLevel: undefined,
  skillXp: undefined,
  badges: [],
  reliability: undefined,
  positiveReportCount: undefined,
  lateCount: undefined,
  noShowCount: undefined,
};

beforeEach(() => {
  mockUseRecognitions.mockReturnValue({
    recognitions: [] as RecognitionRecord[],
    loading: false,
    syncing: false,
    error: null,
    createManualRecognition: vi.fn(),
    syncAutomation: vi.fn(),
  });
  mockUseEmployees.mockReturnValue({ ...baseEmployeesHook });
  mockUseToast.mockReturnValue({ toast: vi.fn() });
  mockUseLeaderboardData.mockReturnValue({ ...baseLeaderboardHook });
});

describe('Recognition page smoke scenarios', () => {
  it('disables manual action while employees are loading and avoids empty state during initial skeleton', () => {
    mockUseRecognitions.mockReturnValue({
      recognitions: [],
      loading: true,
      syncing: false,
      error: null,
      createManualRecognition: vi.fn(),
      syncAutomation: vi.fn(),
    });
    mockUseEmployees.mockReturnValue({
      ...baseEmployeesHook,
      loading: true,
    });

    render(<Recognition />);

    expect(screen.getByRole('button', { name: /give recognition/i })).toBeDisabled();
    expect(screen.queryByText(/No recognitions yet/i)).not.toBeInTheDocument();
  });

  it('shows inline validation errors when submitting empty manual form', () => {
    const createManualRecognition = vi.fn();

    mockUseEmployees.mockReturnValue({
      employees: [
        sampleEmployee,
      ],
      loading: false,
      error: null,
    });
    mockUseRecognitions.mockReturnValue({
      recognitions: [],
      loading: false,
      syncing: false,
      error: null,
      createManualRecognition,
      syncAutomation: vi.fn(),
    });

    render(<Recognition />);

    fireEvent.click(screen.getByRole('button', { name: /give recognition/i }));
    fireEvent.click(screen.getByRole('button', { name: /^give recognition$/i }));

    expect(screen.getByText(/Select a teammate to recognize/)).toBeInTheDocument();
    expect(screen.getByText(/Add a brief recognition message/)).toBeInTheDocument();
    expect(createManualRecognition).not.toHaveBeenCalled();
  });

  it('surface roster error alert when employees API fails', () => {
    mockUseEmployees.mockReturnValue({
      ...baseEmployeesHook,
      error: 'Failed to fetch employees',
    });

    render(<Recognition />);

    expect(screen.getByText(/Employee directory unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch employees/i)).toBeInTheDocument();
  });
});
