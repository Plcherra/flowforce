import type { CopilotActionPayload } from "@/server/copilot/CopilotDTO";
import type {
  CoverageGap,
  CoverageTemplatePlan,
  DraftShift,
  ScheduleSummary,
  SwapSuggestion,
  SchedulerEmployee,
} from "@/features/scheduling/hooks/copilotSchedulerTypes";

export interface UseCopilotSchedulerOptions {
  weekStart: Date;
  weekEnd: Date;
  location?: string;
  existingShifts?: Array<{
    employee_id: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
  }>;
  /** When false, suggestions run only on explicit user action. */
  autoGenerate?: boolean;
  onPublished?: () => void | Promise<void>;
}

export interface CopilotSchedulerState {
  loading: boolean;
  error: string | null;
  employees: SchedulerEmployee[];
  templates: CoverageTemplatePlan[];
  draftShifts: DraftShift[];
  coverageGaps: CoverageGap[];
  swapSuggestions: SwapSuggestion[];
  summary: ScheduleSummary;
  coverageGapActions: CopilotActionPayload[];
  swapActions: CopilotActionPayload[];
  lastGeneratedAt?: string;
}

export const INITIAL_STATE: CopilotSchedulerState = {
  loading: false,
  error: null,
  employees: [],
  templates: [],
  draftShifts: [],
  coverageGaps: [],
  swapSuggestions: [],
  summary: { totalHours: 0, hoursByEmployee: {}, hoursByStore: {} },
  coverageGapActions: [],
  swapActions: [],
};
