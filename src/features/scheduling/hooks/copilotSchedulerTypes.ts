import type { CoverageForecast } from "@/services/analytics/ForecastAPI";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";
import type {
  TimeOffWithUser,
  UnavailabilityWithUser,
} from "@/features/scheduling/hooks/types";

export type AvailabilityWindow = { start: string; end: string };
export type AvailabilityMap = Record<string, AvailabilityWindow[]>;

export interface SchedulerEmployee {
  id: string;
  companyId: string;
  profileId: string;
  displayName?: string | null;
  role: string;
  secondaryRoles: string[];
  homeStore?: string | null;
  weeklyMaxHours: number;
  availability: AvailabilityMap;
  metadata: Record<string, unknown>;
}

export interface CoverageTemplatePlan {
  id: string;
  companyId: string;
  name: string;
  role: string;
  location: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  requiredCount: number;
  forecastMultiplier?: number | null;
  metadata?: Record<string, unknown> | null;
  priority: number;
  flexMinutes: number;
}

export interface DraftShift {
  dedupeKey: string;
  templateId: string;
  scheduleDate: string;
  start: string;
  end: string;
  location: string;
  role: string;
  employeeId: string | null;
  employeeName?: string | null;
  hours: number;
  status: "draft";
}

export interface CoverageGap {
  templateId: string;
  scheduleDate: string;
  role: string;
  location: string;
  requiredCount: number;
  assignedCount: number;
  missingCount: number;
  reason: string;
}

export interface SwapSuggestion {
  id: string;
  templateId: string;
  scheduleDate: string;
  role: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  fromLocation: string;
  toLocation: string;
  reason: string;
}

export interface ScheduleSummary {
  totalHours: number;
  hoursByEmployee: Record<string, number>;
  hoursByStore: Record<string, Record<string, number>>;
}

export interface GeneratePlanInput {
  employees: SchedulerEmployee[];
  templates: CoverageTemplatePlan[];
  weekStart: Date;
  weekEnd: Date;
  forecastMap: Map<string, CoverageForecast>;
  existingHours?: Map<string, number>;
  existingHoursByStore?: Map<string, Record<string, number>>;
  staffAvailability: StaffAvailabilityRow[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
}

export interface GeneratePlanOutput {
  draftShifts: DraftShift[];
  coverageGaps: CoverageGap[];
  swapSuggestions: SwapSuggestion[];
  summary: ScheduleSummary;
}
