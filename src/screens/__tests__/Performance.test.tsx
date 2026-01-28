import {
  describe,
  expect,
  it,
  beforeEach,
  beforeAll,
  afterEach,
  vi,
} from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

type MockLeaderboardInsight = {
  employeeId: string;
  name: string;
  role: string;
  badgeTier: string;
  xp: number;
  period: string;
  periodStart: string | null;
  achievements: string[];
  recognitionCount: number;
};

const mockLeaderboardState: {
  insights: MockLeaderboardInsight[];
  lastUpdated: string | null;
} = {
  insights: [],
  lastUpdated: null,
};

let performanceOverviewMockValue: any;
let recognitionsMockValue: any;
let leaderboardDataMockValue: any;

vi.mock("@/hooks/usePerformanceOverview.tsx", () => ({
  __esModule: true,
  usePerformanceOverview: vi.fn(() => performanceOverviewMockValue),
}));

vi.mock("@/hooks/useRecognitions.tsx", () => ({
  __esModule: true,
  useRecognitions: () => recognitionsMockValue,
}));

vi.mock("@/features/leaderboard/useLeaderboardData.ts", () => ({
  __esModule: true,
  useLeaderboardData: () => leaderboardDataMockValue,
}));

vi.mock("@/hooks/useAuth.tsx", () => ({
  __esModule: true,
  useAuth: () => ({
    user: { id: "user-1" },
    session: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProfile.ts", () => ({
  __esModule: true,
  useProfile: () => ({
    profile: { companyId: "company-1" },
    loading: false,
    refetchProfile: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const createQueryBuilder = () => {
    const result = { data: [], error: null };
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: (resolve: (value: any) => any, reject?: (reason: any) => any) =>
        Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  };

  const supabaseMock = {
    from: vi.fn(() => createQueryBuilder()),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: null, error: null }),
      ),
      signUp: vi.fn(() => Promise.resolve({ data: null, error: null })),
      resetPasswordForEmail: vi.fn(() =>
        Promise.resolve({ data: null, error: null }),
      ),
      updateUser: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
  };

  return {
    __esModule: true,
    supabase: supabaseMock,
  };
});

vi.mock("@/stores/useLeaderboardInsights", () => ({
  __esModule: true,
  useLeaderboardInsightsStore: (
    selector: (state: typeof mockLeaderboardState) => unknown,
  ) => selector(mockLeaderboardState),
}));

describe("Performance page rendering", () => {
  let Performance: any;
  let queryClient: QueryClient;

  beforeAll(async () => {
    Performance = (await import("../Performance")).default;
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false },
      },
    });

    mockLeaderboardState.insights = [
      {
        employeeId: "emp-1",
        name: "Ada Lovelace",
        role: "principal-engineer",
        badgeTier: "Gold",
        xp: 1200,
        period: "monthly",
        periodStart: "2024-01-01T00:00:00.000Z",
        achievements: ["Top performer", "Goal crusher"],
        recognitionCount: 3,
      },
    ];
    mockLeaderboardState.lastUpdated = new Date().toISOString();

    performanceOverviewMockValue = {
      employees: [
        {
          id: "emp-1",
          fullName: "Ada Lovelace",
          role: "Principal Engineer",
          avatarUrl: null,
          activeGoals: 2,
          completedGoals: 1,
          averageGoalProgress: 65,
          reviewCount: 3,
          averageReviewScore: 4.2,
          lastReviewDate: "2024-01-01T00:00:00.000Z",
        },
      ],
      goals: [
        {
          id: "goal-1",
          title: "Improve Efficiency",
          status: "in_progress",
          progress: 70,
          targetCompletionDate: "2024-03-01T00:00:00.000Z",
          createdAt: "2023-12-01T00:00:00.000Z",
          participantIds: ["emp-1"],
        },
      ],
      reviews: [
        {
          id: "rev-1",
          employeeId: "emp-1",
          employeeName: "Ada Lovelace",
          date: "2024-01-01T00:00:00.000Z",
          severity: 4,
          notes: "Consistently exceeds expectations.",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      radar: [],
      dataset: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    };

    recognitionsMockValue = {
      recognitions: [],
      loading: false,
      syncing: false,
      error: null,
      refresh: vi.fn(),
      syncAutomation: vi.fn(),
      createManualRecognition: vi.fn(),
    };
    leaderboardDataMockValue = {
      loading: false,
      error: null,
      refresh: vi.fn(),
    };
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("renders employee performance metrics as cards", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Performance />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Performance Management" }),
    ).toBeInTheDocument();

    const activeGoalsTile = screen.getByText("Active Goals").parentElement;
    expect(activeGoalsTile).toBeTruthy();
    expect(activeGoalsTile).toHaveTextContent("2");

    const completedGoalsTile =
      screen.getByText("Completed Goals").parentElement;
    expect(completedGoalsTile).toBeTruthy();
    expect(completedGoalsTile).toHaveTextContent("1");

    const avgGoalProgressTile =
      screen.getByText("Avg Goal Progress").parentElement;
    expect(avgGoalProgressTile).toBeTruthy();
    expect(avgGoalProgressTile).toHaveTextContent("65%");

    const avgReviewScoreTile =
      screen.getByText("Avg Review Score").parentElement;
    expect(avgReviewScoreTile).toBeTruthy();
    expect(avgReviewScoreTile).toHaveTextContent("4.2");
  });

  it("shows goal progress when switching to Goals tab", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Performance />
      </QueryClientProvider>,
    );

    const goalsTab = screen.getByRole("tab", { name: "Goals & Objectives" });
    fireEvent.mouseDown(goalsTab);
    fireEvent.click(goalsTab);

    expect(goalsTab).toHaveAttribute("data-state", "active");
    expect(await screen.findByText("Current Goals")).toBeInTheDocument();
    expect(await screen.findByText("Improve Efficiency")).toBeInTheDocument();
    expect(await screen.findByText("70%")).toBeInTheDocument();
  });

  it("offers retry when leaderboard insights fail", () => {
    leaderboardDataMockValue.error = "Leaderboard unavailable";

    render(
      <QueryClientProvider client={queryClient}>
        <Performance />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText("Unable to load leaderboard insights"),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", {
      name: /Retry leaderboard sync/i,
    });
    fireEvent.click(retryButton);
    expect(leaderboardDataMockValue.refresh).toHaveBeenCalledTimes(1);
  });

  it("allows retrying recognition fetch failures", () => {
    const recognitionRetry = vi.fn();
    recognitionsMockValue = {
      recognitions: [],
      loading: false,
      syncing: false,
      error: "Recognitions failed",
      refresh: recognitionRetry,
      syncAutomation: vi.fn(),
      createManualRecognition: vi.fn(),
    };

    render(
      <QueryClientProvider client={queryClient}>
        <Performance />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText("Unable to load recognition activity"),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", {
      name: /Retry recognitions/i,
    });
    fireEvent.click(retryButton);
    expect(recognitionRetry).toHaveBeenCalledTimes(1);
  });
});
