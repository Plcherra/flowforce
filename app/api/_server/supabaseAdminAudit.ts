/**
 * Audit logging for Supabase Admin (service role) operations
 *
 * Service role bypasses RLS, so all operations must be logged for security auditing.
 * This helps track:
 * - What operations were performed
 * - When they occurred
 * - Who/what triggered them (request context)
 * - What data was accessed/modified
 */

import { createServerLogger } from "./utils/logger";

interface AuditContext {
  requestId?: string;
  userId?: string;
  companyId?: string;
  operation: string;
  table?: string;
  recordId?: string;
  metadata?: Record<string, unknown>;
}

const auditLogger = createServerLogger("supabase-admin-audit", {
  tags: ["security", "audit"],
});

/**
 * Log a service role operation for audit purposes
 */
export function auditServiceRoleOperation(context: AuditContext): void {
  const {
    requestId,
    userId,
    companyId,
    operation,
    table,
    recordId,
    metadata = {},
  } = context;

  auditLogger.warn("Service role operation", {
    requestId,
    userId,
    companyId,
    operation,
    table,
    recordId,
    metadata,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to:
  // 1. Store this in a dedicated audit_logs table
  // 2. Send to external logging service (Datadog, Sentry, etc.)
  // 3. Alert on suspicious patterns (e.g., bulk deletions, cross-tenant access)
}

/**
 * Audit helper for common operations
 */
export const auditHelpers = {
  select: (
    table: string,
    filters: Record<string, unknown>,
    context: Omit<AuditContext, "operation" | "table">,
  ) => {
    auditServiceRoleOperation({
      ...context,
      operation: "SELECT",
      table,
      metadata: { filters },
    });
  },

  insert: (
    table: string,
    recordId: string,
    context: Omit<AuditContext, "operation" | "table" | "recordId">,
  ) => {
    auditServiceRoleOperation({
      ...context,
      operation: "INSERT",
      table,
      recordId,
    });
  },

  update: (
    table: string,
    recordId: string,
    updates: Record<string, unknown>,
    context: Omit<AuditContext, "operation" | "table" | "recordId">,
  ) => {
    auditServiceRoleOperation({
      ...context,
      operation: "UPDATE",
      table,
      recordId,
      metadata: { updates },
    });
  },

  delete: (
    table: string,
    recordId: string,
    context: Omit<AuditContext, "operation" | "table" | "recordId">,
  ) => {
    auditServiceRoleOperation({
      ...context,
      operation: "DELETE",
      table,
      recordId,
    });
  },
};
