
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCan } from '@/hooks/useCan';

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  performed_by: string;
  created_at: string;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  performed_by_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function useAuditLogs() {
  const { can } = useCan();

  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      // Direct table query with type assertion to bypass TypeScript issues
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }
      
      // If we have data, try to enrich it with user profiles
      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (log: any) => {
            // Get user profile for the affected user
            let userProfile = null;
            if (log.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', log.user_id)
                .single();
              userProfile = profile;
            }

            // Get profile for the user who performed the action
            let performedByProfile = null;
            if (log.performed_by) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', log.performed_by)
                .single();
              performedByProfile = profile;
            }

            return {
              ...log,
              user_profile: userProfile,
              performed_by_profile: performedByProfile,
            } as AuditLog;
          })
        );
        
        return enrichedData;
      }

      // Safe type conversion: first to unknown, then to our expected type
      return (data as unknown as AuditLog[]) || [];
    },
    enabled: can('manageUsers'),
  });
}
