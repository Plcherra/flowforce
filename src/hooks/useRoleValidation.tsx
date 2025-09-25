import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { useCompanyRoles } from './useCompanyRoles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

/**
 * Hook to provide role validation and auto-assignment guardrails
 * Ensures users have valid roles and company assignments
 */
export function useRoleValidation() {
  const { user } = useAuth();
  const { profile, refetchProfile } = useProfile();
  const { roles } = useCompanyRoles();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !profile || !roles?.length) return;

    const validateAndFixRole = async () => {
      try {
        // Check if user has a valid role_id that matches an existing company role
        const hasValidRoleId = profile.role_id && roles.some(role => role.id === profile.role_id);
        
        // Check if user's role string matches any company role name
        const matchingRole = roles.find(role => 
          role.name.toLowerCase() === profile.role?.toLowerCase()
        );

        // Auto-fix: If no valid role_id but has matching role name, update role_id
        if (!hasValidRoleId && matchingRole) {
          await supabase
            .from('profiles')
            .update({ role_id: matchingRole.id })
            .eq('id', profile.id);

          await refetchProfile();
          
          console.info('[Role Validation] Auto-assigned role_id:', matchingRole.id, 'for role:', matchingRole.name);
          return;
        }

        // Auto-fix: If no valid role at all, assign default role based on hierarchy
        if (!hasValidRoleId && !matchingRole) {
          const defaultRole = roles.find(role => role.hierarchy_level === 0) || roles[0];
          
          if (defaultRole) {
            // Map company role name to valid profile role type
            const validRoleMapping: Record<string, string> = {
              'owner': 'owner',
              'admin': 'admin', 
              'manager': 'manager',
              'supervisor': 'supervisor',
              'employee': 'employee',
              'staff': 'staff'
            };
            
            const profileRole = validRoleMapping[defaultRole.name.toLowerCase()] || 'staff';
            
            await supabase
              .from('profiles')
              .update({ 
                role_id: defaultRole.id,
                role: profileRole as any
              })
              .eq('id', profile.id);

            await refetchProfile();
            
            toast({
              title: "Role Assigned",
              description: `You've been assigned the ${defaultRole.name} role.`,
            });
            
            console.info('[Role Validation] Auto-assigned default role:', defaultRole.name);
          }
        }
      } catch (error) {
        console.error('[Role Validation] Failed to validate/fix role:', error);
      }
    };

    // Run validation after a short delay to ensure data is loaded
    const timeoutId = setTimeout(validateAndFixRole, 1000);
    return () => clearTimeout(timeoutId);
  }, [user, profile, roles, refetchProfile, toast]);

  return {
    isValid: profile?.role_id && roles?.some(role => role.id === profile.role_id)
  };
}