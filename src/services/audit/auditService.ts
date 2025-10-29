import { supabase } from '@/integrations/supabase/client';

export interface AuditEventPayload {
  targetUserId?: string | null;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Write an audit event using the `log_audit_event` RPC helper.
 * The call gracefully degrades in case of RLS or connectivity issues.
 */
export async function logAuditEvent({
  targetUserId = null,
  action,
  tableName,
  recordId = null,
  oldValues = null,
  newValues = null,
}: AuditEventPayload): Promise<void> {
  if (!action || !tableName) {
    console.warn('[auditService] Missing action or table name, skipping audit log.');
    return;
  }

  const { error } = await supabase.rpc('log_audit_event' as any, {
    target_user_id: targetUserId,
    event_action: action,
    target_table: tableName,
    target_record_id: recordId,
    previous_values: oldValues,
    next_values: newValues,
  });

  if (error) {
    console.error('[auditService] Failed to log audit event', {
      action,
      tableName,
      error,
    });
  }
}
