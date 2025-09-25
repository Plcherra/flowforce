// Unified scheduling types that match database schema exactly
import type { Tables, Enums } from '@/integrations/supabase/types';

// Base types from database
export type DbSchedule = Tables<'schedules'>;
export type DbShiftTemplate = Tables<'shift_templates'>;
export type DbScheduleAssignment = Tables<'schedule_assignments'>;
export type DbShiftSwap = Tables<'shift_swaps'>;
export type DbTimeOffRequest = Tables<'time_off_requests'>;
export type DbStaffAvailability = Tables<'staff_availability'>;
export type DbWeekTemplate = Tables<'week_templates'>;
export type DbComplianceRule = Tables<'compliance_rules'>;
export type DbStaffPerformance = Tables<'staff_performance'>;

// View types
export type ViewType = 'day' | 'week' | 'month';

// Enhanced types with relationships
export interface Schedule extends DbSchedule {
  assignments?: ScheduleAssignment[];
  position?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface ScheduleAssignment extends DbScheduleAssignment {
  user_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface ShiftSwap extends DbShiftSwap {
  requesting_user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  target_user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  schedule?: Schedule;
}

export interface TimeOffRequest extends DbTimeOffRequest {
  user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface StaffAvailability extends DbStaffAvailability {
  user?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

// Filter types
export interface SchedulingFilters {
  positions: string[];
  users: string[];
  status: string;
  departments: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// State management types
export interface SchedulingState {
  schedules: Schedule[];
  shiftTemplates: DbShiftTemplate[];
  assignments: ScheduleAssignment[];
  shiftSwaps: ShiftSwap[];
  timeOffRequests: TimeOffRequest[];
  staffAvailability: StaffAvailability[];
  weekTemplates: DbWeekTemplate[];
  complianceRules: DbComplianceRule[];
  staffPerformance: DbStaffPerformance[];
  loading: boolean;
  error: string | null;
}

// Action types for state management
export type SchedulingAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCHEDULES'; payload: Schedule[] }
  | { type: 'ADD_SCHEDULE'; payload: Schedule }
  | { type: 'UPDATE_SCHEDULE'; payload: Schedule }
  | { type: 'DELETE_SCHEDULE'; payload: string }
  | { type: 'SET_SHIFT_TEMPLATES'; payload: DbShiftTemplate[] }
  | { type: 'SET_ASSIGNMENTS'; payload: ScheduleAssignment[] }
  | { type: 'SET_SHIFT_SWAPS'; payload: ShiftSwap[] }
  | { type: 'SET_TIME_OFF_REQUESTS'; payload: TimeOffRequest[] }
  | { type: 'SET_STAFF_AVAILABILITY'; payload: StaffAvailability[] }
  | { type: 'SET_WEEK_TEMPLATES'; payload: DbWeekTemplate[] }
  | { type: 'SET_COMPLIANCE_RULES'; payload: DbComplianceRule[] }
  | { type: 'SET_STAFF_PERFORMANCE'; payload: DbStaffPerformance[] };

// Component prop types
export interface SchedulingCalendarProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  filters?: SchedulingFilters;
  onFiltersChange?: (filters: SchedulingFilters) => void;
  currentView?: ViewType;
  onViewChange?: (view: ViewType) => void;
}

export interface ShiftFormData {
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  is_all_day?: boolean;
  timezone?: string;
  required_headcount?: number;
  notes?: string;
  position_id?: string | null;
  break_minutes?: number;
  hourly_rate?: number;
}

// API Response types
export interface SchedulingApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Utility types
export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled' | 'in-progress' | 'confirmed' | 'no_show';
export type SwapStatus = 'pending' | 'approved' | 'rejected';
export type SwapType = 'swap' | 'claim' | 'give_away';
export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';