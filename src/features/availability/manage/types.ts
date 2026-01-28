import type { AvailabilityRequest } from "@/types/availability";
import type { AvailabilityGrid } from "@/components/availability/AvailabilityRequestForm";

export interface ManagerAvailabilityRequest extends AvailabilityRequest {
  employeeName: string;
  originalAvailability: AvailabilityGrid;
  desiredAvailability: AvailabilityGrid;
  requestedRange: { start: string; end: string };
  reason: string;
  impactScore: number;
}

export interface AvailabilityEmployee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
}

export interface ExceptionFormState {
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LockStatePreview {
  nextLock: string | null;
}

export interface DayOption {
  value: string;
  label: string;
}

export interface HourOption {
  value: string;
  label: string;
}
