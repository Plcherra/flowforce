import type { Tables } from "@/integrations/supabase/public-types";
import type {
  AssignmentWithUser,
  ShiftWithAssignments,
  TimeOffWithUser,
  UnavailabilityWithUser,
  VendorEventWithMetadata,
} from "@/features/scheduling/hooks/useSchedulingConsolidated";


export interface VendorFormState {
  locationId: string;
  notes: string;
  shiftId: string;
  startTime: string;
  endTime: string;
}

export interface MultiAddState {
  title: string;
  start: string;
  end: string;
  days: number[];
  headcount: number;
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface VendorPaletteItem {
  id: string;
  label: string;
  vendorType: string;
  color: string;
  defaultDurationHours: number;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  role: string;
  color: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  maxStaff: number;
}

export interface PendingVendorEvent {
  vendor: VendorPaletteItem;
  start: Date;
  end: Date;
}

export interface DragDropDerivedData {
  weekStart: Date;
  weekDays: Date[];
  hours: number[];
  companyId: string | null;
  schedules: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOffRequests: TimeOffWithUser[];
  staffAvailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventWithMetadata[];
}

export interface DragDropActions {
  createSchedule: (
    payload: Omit<Tables<"schedules">, "id" | "company_id" | "created_by">,
  ) => Promise<Tables<"schedules"> | null>;
  updateSchedule: (
    id: string,
    updates: Partial<Tables<"schedules">>,
  ) => Promise<Tables<"schedules"> | null>;
  assign: (
    shiftId: string,
    userId: string,
    status?: string,
  ) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  createVendorEvent: (
    payload: Tables<"vendor_event">,
  ) => Promise<Tables<"vendor_event"> | null>;
  refetchAll: () => Promise<void>;
}
