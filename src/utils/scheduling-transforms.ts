// Data transformation utilities for scheduling system
import type { Tables } from '@/integrations/supabase/types';
import type { Schedule, ScheduleStatus, DbSchedule } from '@/types/scheduling-unified';

/**
 * Transform raw database schedule to application Schedule type
 */
export function transformDbScheduleToSchedule(dbSchedule: Tables<'schedules'>): Schedule {
  return {
    ...dbSchedule,
    // Ensure required fields have proper defaults
    location: dbSchedule.location || '',
    is_all_day: dbSchedule.is_all_day || false,
    timezone: dbSchedule.timezone || 'UTC',
    required_headcount: dbSchedule.required_headcount || 1,
    notes: dbSchedule.notes || '',
    user_id: dbSchedule.user_id || dbSchedule.created_by,
    requirements: Array.isArray(dbSchedule.requirements) ? dbSchedule.requirements : [],
    // Transform status to match expected enum
    status: transformScheduleStatus(dbSchedule.status)
  };
}

/**
 * Transform schedule status to proper enum value
 */
export function transformScheduleStatus(status: string | null): ScheduleStatus {
  switch (status) {
    case 'active':
    case 'scheduled':
      return 'scheduled';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'in-progress':
      return 'in-progress';
    case 'confirmed':
      return 'confirmed';
    case 'no_show':
      return 'no_show';
    default:
      return 'scheduled';
  }
}

/**
 * Transform array of database schedules to application schedules
 */
export function transformDbSchedulesToSchedules(dbSchedules: Tables<'schedules'>[]): Schedule[] {
  return dbSchedules.map(transformDbScheduleToSchedule);
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

/**
 * Calculate total hours for schedules
 */
export function calculateTotalHours(schedules: Schedule[]): number {
  return schedules.reduce((total, schedule) => {
    return total + calculateShiftDuration(schedule.start_time, schedule.end_time);
  }, 0);
}

/**
 * Filter schedules by date range
 */
export function filterSchedulesByDateRange(
  schedules: Schedule[], 
  startDate: Date, 
  endDate: Date
): Schedule[] {
  return schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time);
    return scheduleDate >= startDate && scheduleDate <= endDate;
  });
}

/**
 * Group schedules by date
 */
export function groupSchedulesByDate(schedules: Schedule[]): Record<string, Schedule[]> {
  return schedules.reduce((groups, schedule) => {
    const date = new Date(schedule.start_time).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);
}

/**
 * Validate shift data
 */
export function validateShiftData(data: Partial<Schedule>): string[] {
  const errors: string[] = [];

  if (!data.title?.trim()) {
    errors.push('Title is required');
  }

  if (!data.start_time) {
    errors.push('Start time is required');
  }

  if (!data.end_time) {
    errors.push('End time is required');
  }

  if (data.start_time && data.end_time) {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    
    if (end <= start) {
      errors.push('End time must be after start time');
    }

    // Check for reasonable shift length (not more than 24 hours)
    const duration = calculateShiftDuration(data.start_time, data.end_time);
    if (duration > 24) {
      errors.push('Shift duration cannot exceed 24 hours');
    }
  }

  if (data.required_headcount && data.required_headcount < 1) {
    errors.push('Required headcount must be at least 1');
  }

  if (data.break_minutes && data.break_minutes < 0) {
    errors.push('Break minutes cannot be negative');
  }

  if (data.hourly_rate && data.hourly_rate < 0) {
    errors.push('Hourly rate cannot be negative');
  }

  return errors;
}

/**
 * Format user name from profile data
 */
export function formatUserName(user: { first_name: string; last_name: string } | null): string {
  if (!user) return 'Unknown User';
  return `${user.first_name} ${user.last_name}`.trim() || 'Unknown User';
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(user: { first_name: string; last_name: string } | null): string {
  if (!user) return '?';
  const first = user.first_name?.[0]?.toUpperCase() || '';
  const last = user.last_name?.[0]?.toUpperCase() || '';
  return `${first}${last}` || '?';
}

/**
 * Sort schedules by start time
 */
export function sortSchedulesByStartTime(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort((a, b) => {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });
}

/**
 * Check if two date ranges overlap
 */
export function doDateRangesOverlap(
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);

  return s1 < e2 && s2 < e1;
}