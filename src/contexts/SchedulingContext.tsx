import React, { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchedulingConsolidated } from '@/hooks/useSchedulingConsolidated';

// Context interface (simplified since we're using the consolidated hook)
interface SchedulingContextType {
  // Data
  schedules: any[];
  shiftTemplates: any[];
  assignments: any[];
  shiftSwaps: any[];
  timeOffRequests: any[];
  staffAvailability: any[];
  weekTemplates: any[];
  complianceRules: any[];
  staffPerformance: any[];
  loading: boolean;
  error: string | null;
  
  // Data fetching
  fetchSchedules: () => Promise<void>;
  fetchShiftTemplates: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchShiftSwaps: () => Promise<void>;
  fetchTimeOffRequests: () => Promise<void>;
  fetchStaffAvailability: () => Promise<void>;
  
  // Schedule operations
  createSchedule: (data: any) => Promise<any | null>;
  updateSchedule: (id: string, data: any) => Promise<any | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  
  // Assignment operations
  assignUserToShift: (scheduleId: string, userId: string, role?: string) => Promise<boolean>;
  unassignUserFromShift: (scheduleId: string, userId: string) => Promise<boolean>;
  
  // Utility functions
  getSchedulesByDateRange: (startDate: Date, endDate: Date) => any[];
  getSchedulesForDate: (date: Date) => any[];
  getTotalHoursForPeriod: (startDate: Date, endDate: Date) => number;
}

const SchedulingContext = createContext<SchedulingContextType | undefined>(undefined);

// Provider component
interface SchedulingProviderProps {
  children: React.ReactNode;
}

export function SchedulingProvider({ children }: SchedulingProviderProps) {
  const schedulingHook = useSchedulingConsolidated();
  
  // Use the consolidated hook's data and transform it to match the context interface
  const contextValue: SchedulingContextType = {
    // State from the consolidated hook
    schedules: schedulingHook.schedules || [],
    shiftTemplates: [],
    assignments: schedulingHook.assignments || [],
    shiftSwaps: [],
    timeOffRequests: [],
    staffAvailability: schedulingHook.unavailability || [],
    weekTemplates: [],
    complianceRules: [],
    staffPerformance: [],
    loading: schedulingHook.loading,
    error: schedulingHook.error,
    
    // Methods from the consolidated hook
    fetchSchedules: schedulingHook.fetchSchedules,
    fetchShiftTemplates: async () => {}, // Stub
    fetchAssignments: schedulingHook.fetchAssignments,
    fetchShiftSwaps: async () => {}, // Stub
    fetchTimeOffRequests: async () => {}, // Stub
    fetchStaffAvailability: schedulingHook.fetchUnavailability,
    
    createSchedule: async (data: any): Promise<any | null> => {
      const result = await schedulingHook.createSchedule(data);
      return result.data;
    },
    
    updateSchedule: async (id: string, data: any): Promise<any | null> => {
      const result = await schedulingHook.updateSchedule(id, data);
      return result.data;
    },
    
    deleteSchedule: async (id: string): Promise<boolean> => {
      const result = await schedulingHook.deleteSchedule(id);
      return !result.error;
    },
    
    assignUserToShift: async (scheduleId: string, userId: string, role = 'staff'): Promise<boolean> => {
      // Implementation using supabase directly since it's not in the consolidated hook yet
      try {
        const { error } = await supabase
          .from('schedule_assignments')
          .insert({
            schedule_id: scheduleId,
            user_id: userId,
            role,
            status: 'confirmed'
          });

        if (error) throw error;
        await schedulingHook.fetchSchedules();
        return true;
      } catch (error) {
        console.error('Error assigning user:', error);
        return false;
      }
    },
    
    unassignUserFromShift: async (scheduleId: string, userId: string): Promise<boolean> => {
      // Implementation using supabase directly since it's not in the consolidated hook yet
      try {
        const { error } = await supabase
          .from('schedule_assignments')
          .delete()
          .eq('schedule_id', scheduleId)
          .eq('user_id', userId);

        if (error) throw error;
        await schedulingHook.fetchSchedules();
        return true;
      } catch (error) {
        console.error('Error unassigning user:', error);
        return false;
      }
    },
    
    // Utility functions
    getSchedulesByDateRange: (startDate: Date, endDate: Date): any[] => {
      return schedulingHook.schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
    },
    
    getSchedulesForDate: (date: Date): any[] => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return schedulingHook.schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time);
        return scheduleDate >= startOfDay && scheduleDate <= endOfDay;
      });
    },
    
    getTotalHoursForPeriod: (startDate: Date, endDate: Date): number => {
      const periodSchedules = schedulingHook.schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      
      return periodSchedules.reduce((total, schedule) => {
        const start = new Date(schedule.start_time);
        const end = new Date(schedule.end_time);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);
    }
  };

  return (
    <SchedulingContext.Provider value={contextValue}>
      {children}
    </SchedulingContext.Provider>
  );
}

// Hook to use the context
export function useScheduling() {
  const context = useContext(SchedulingContext);
  if (context === undefined) {
    throw new Error('useScheduling must be used within a SchedulingProvider');
  }
  return context;
}