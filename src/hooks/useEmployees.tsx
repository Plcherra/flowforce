import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  employment_status: string;
  position?: {
    id: string;
    name: string;
    role: string;
  };
}

export function useEmployees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    } else {
      setEmployees([]);
      setLoading(false);
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      setError(null);
      
      // Get current user's company to filter employees
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          avatar_url,
          role,
          employment_status,
          position:positions(
            id,
            name,
            role
          )
        `)
        .eq('employment_status', 'active');

      // Filter by company if user has one
      if (currentProfile?.company_id) {
        query = query.eq('company_id', currentProfile.company_id);
      }

      const { data, error: fetchError } = await query.order('first_name', { ascending: true });

      if (fetchError) throw fetchError;
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeesByPosition = (positionId: string) => {
    return employees.filter(emp => emp.position?.id === positionId);
  };

  const getEmployeeFullName = (employee: Employee) => {
    return `${employee.first_name} ${employee.last_name}`.trim();
  };

  return {
    employees,
    loading,
    error,
    getEmployeesByPosition,
    getEmployeeFullName,
    refetchEmployees: fetchEmployees
  };
}