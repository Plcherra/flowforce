import { useCallback } from "react";
import { useAuth } from "./useAuth";
import type { PermissionKey } from "./useUserPermissions";
import { isPermissionKey as isRegisteredPermissionKey } from "@/lib/permissions/registry";
import { logger } from "@/utils/logger";

interface AuditLogEntry {
  user_id: string;
  permission_key: PermissionKey;
  action: "check" | "grant" | "deny" | "override";
  result: boolean;
  source: "role" | "allow_override" | "deny_override";
  context?: Record<string, any>;
  timestamp: string;
}

/**
 * Hook for auditing permission checks and changes
 * Provides security monitoring and compliance logging
 */
export function usePermissionAudit() {
  const { user } = useAuth();

  const logPermissionCheck = useCallback(
    async (
      permissionKey: PermissionKey,
      result: boolean,
      source: "role" | "allow_override" | "deny_override",
      context?: Record<string, any>,
    ) => {
      if (!user?.id) return;

      try {
        // In production, this would go to an audit log table
        // For now, we'll use console logging with structured format
        const auditEntry: AuditLogEntry = {
          user_id: user.id,
          permission_key: permissionKey,
          action: "check",
          result,
          source,
          context,
          timestamp: new Date().toISOString(),
        };

        // Development: Log to logger
        if (process.env.NODE_ENV === "development") {
          logger.info("[Permission Audit]", {
            context: auditEntry,
            tags: ["audit", "permission"],
          });
        }

        // Production: Could send to audit service or log table
        // await supabase.from('permission_audit_logs').insert(auditEntry);
      } catch (error) {
        logger.error("[Permission Audit] Failed to log permission check", {
          error,
          tags: ["error", "audit"],
        });
      }
    },
    [user?.id],
  );

  const logPermissionOverride = useCallback(
    async (
      permissionKey: PermissionKey,
      oldValue: string | undefined,
      newValue: string,
      targetUserId?: string,
    ) => {
      if (!user?.id) return;

      try {
        const auditEntry: AuditLogEntry = {
          user_id: user.id,
          permission_key: permissionKey,
          action: "override",
          result: newValue === "allow",
          source: newValue === "allow" ? "allow_override" : "deny_override",
          context: {
            old_value: oldValue,
            new_value: newValue,
            target_user_id: targetUserId,
          },
          timestamp: new Date().toISOString(),
        };

        if (process.env.NODE_ENV === "development") {
          logger.info("[Permission Audit] Override", {
            context: auditEntry,
            tags: ["audit", "permission"],
          });
        }
      } catch (error) {
        logger.error("[Permission Audit] Failed to log permission override", {
          error,
          tags: ["error", "audit"],
        });
      }
    },
    [user?.id],
  );

  return {
    logPermissionCheck,
    logPermissionOverride,
  };
}

/**
 * Type-safe permission key validator
 * Ensures only valid permission keys are used at compile time
 */
export function isValidPermissionKey(key: string): key is PermissionKey {
  return isRegisteredPermissionKey(key);
}

/**
 * Enhanced permission checker with audit logging
 */
export function useAuditedPermissionCheck() {
  const { logPermissionCheck } = usePermissionAudit();

  const checkWithAudit = useCallback(
    (
      checkFunction: (key: PermissionKey) => boolean,
      getSource: (
        key: PermissionKey,
      ) => "role" | "allow_override" | "deny_override",
    ) => {
      return (permissionKey: PermissionKey, context?: Record<string, any>) => {
        const result = checkFunction(permissionKey);
        const source = getSource(permissionKey);

        // Log the permission check for audit purposes
        logPermissionCheck(permissionKey, result, source, context);

        return result;
      };
    },
    [logPermissionCheck],
  );

  return { checkWithAudit };
}
