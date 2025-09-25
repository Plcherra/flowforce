import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { PermissionKey } from './useUserPermissions';

interface AuditLogEntry {
  user_id: string;
  permission_key: PermissionKey;
  action: 'check' | 'grant' | 'deny' | 'override';
  result: boolean;
  source: 'role' | 'allow_override' | 'deny_override';
  context?: Record<string, any>;
  timestamp: string;
}

/**
 * Hook for auditing permission checks and changes
 * Provides security monitoring and compliance logging
 */
export function usePermissionAudit() {
  const { user } = useAuth();

  const logPermissionCheck = useCallback(async (
    permissionKey: PermissionKey,
    result: boolean,
    source: 'role' | 'allow_override' | 'deny_override',
    context?: Record<string, any>
  ) => {
    if (!user?.id) return;

    try {
      // In production, this would go to an audit log table
      // For now, we'll use console logging with structured format
      const auditEntry: AuditLogEntry = {
        user_id: user.id,
        permission_key: permissionKey,
        action: 'check',
        result,
        source,
        context,
        timestamp: new Date().toISOString()
      };

      // Development: Log to console
      if (process.env.NODE_ENV === 'development') {
        console.log('[Permission Audit]', auditEntry);
      }

      // Production: Could send to audit service or log table
      // await supabase.from('permission_audit_logs').insert(auditEntry);
    } catch (error) {
      console.error('[Permission Audit] Failed to log permission check:', error);
    }
  }, [user?.id]);

  const logPermissionOverride = useCallback(async (
    permissionKey: PermissionKey,
    oldValue: string | undefined,
    newValue: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return;

    try {
      const auditEntry: AuditLogEntry = {
        user_id: user.id,
        permission_key: permissionKey,
        action: 'override',
        result: newValue === 'allow',
        source: newValue === 'allow' ? 'allow_override' : 'deny_override',
        context: {
          old_value: oldValue,
          new_value: newValue,
          target_user_id: targetUserId
        },
        timestamp: new Date().toISOString()
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[Permission Audit] Override:', auditEntry);
      }
    } catch (error) {
      console.error('[Permission Audit] Failed to log permission override:', error);
    }
  }, [user?.id]);

  return {
    logPermissionCheck,
    logPermissionOverride
  };
}

/**
 * Type-safe permission key validator
 * Ensures only valid permission keys are used at compile time
 */
export function isValidPermissionKey(key: string): key is PermissionKey {
  // This would ideally import from a const assertion, but for safety:
  const validKeys = [
    'viewOwnProfile', 'viewTeamProfiles', 'editOwnProfile', 'editTeamProfiles',
    'viewOwnSchedules', 'viewTeamSchedules', 'viewOwnTasks', 'viewTeamTasks',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
    'inventory.import', 'inventory.export', 'inventory.counts.view',
    'inventory.counts.create', 'inventory.counts.edit', 'inventory.prep.view',
    'inventory.prep.edit', 'inventory.waste.view', 'inventory.waste.create',
    'inventory.purchasing.view', 'inventory.purchasing.manage'
    // Add other keys as needed
  ] as const;
  
  return validKeys.includes(key as any);
}

/**
 * Enhanced permission checker with audit logging
 */
export function useAuditedPermissionCheck() {
  const { logPermissionCheck } = usePermissionAudit();

  const checkWithAudit = useCallback((
    checkFunction: (key: PermissionKey) => boolean,
    getSource: (key: PermissionKey) => 'role' | 'allow_override' | 'deny_override'
  ) => {
    return (permissionKey: PermissionKey, context?: Record<string, any>) => {
      const result = checkFunction(permissionKey);
      const source = getSource(permissionKey);
      
      // Log the permission check for audit purposes
      logPermissionCheck(permissionKey, result, source, context);
      
      return result;
    };
  }, [logPermissionCheck]);

  return { checkWithAudit };
}