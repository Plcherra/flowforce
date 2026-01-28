import { create } from "zustand";

export interface LeaderboardInsightRecord {
  employeeId: string;
  name: string;
  role: string;
  badgeTier: string;
  xp: number;
  period: string;
  periodStart: string | null;
  achievements: string[];
  recognitionCount: number;
}

interface LeaderboardInsightsState {
  insights: LeaderboardInsightRecord[];
  lastUpdated: string | null;
  setInsights: (
    insights: LeaderboardInsightRecord[],
    lastUpdated: string,
  ) => void;
  clear: () => void;
}

export const useLeaderboardInsightsStore = create<LeaderboardInsightsState>(
  (set) => ({
    insights: [],
    lastUpdated: null,
    setInsights: (insights, lastUpdated) => set({ insights, lastUpdated }),
    clear: () => set({ insights: [], lastUpdated: null }),
  }),
);
