import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useAuditLogs,
  type AuditLog as AuditLogEntry,
} from "@/hooks/useAuditLogs";
import { Activity, User, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AuditLog() {
  const {
    data: auditLogs = [],
    isLoading,
    error,
    isAuditEnabled,
  } = useAuditLogs();

  if (!isAuditEnabled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Audit Logs Disabled
          </h3>
          <p className="text-gray-500">
            Enable the audit logs feature to track administrative actions in
            this view.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Audit Log
          </h3>
          <p className="text-gray-500">
            Failed to load audit log data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityBadgeColor = (severity?: string) => {
    const colors = {
      critical: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      info: "bg-blue-100 text-blue-800",
    };
    return (
      colors[severity as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  };

  const formatAction = (action: string) =>
    action
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const describeChange = (log: AuditLogEntry) => {
    if (log.action === "user.role_updated") {
      return `Role changed from ${(log.old_values as Record<string, string> | null)?.role ?? "unknown"} to ${(log.new_values as Record<string, string> | null)?.role ?? "unknown"}.`;
    }

    if (log.action === "user.status_updated") {
      return `Status changed from ${(log.old_values as Record<string, string> | null)?.employment_status ?? "unknown"} to ${(log.new_values as Record<string, string> | null)?.employment_status ?? "unknown"}.`;
    }

    if (log.action === "permission.overrides_updated") {
      return "Permission overrides were updated.";
    }

    if (log.action === "system_settings.updated") {
      return `Updated settings: ${Object.keys(log.new_values ?? {}).join(", ") || "unknown"}.`;
    }

    if (log.action.includes("invite")) {
      return `Invite activity for ${log.metadata?.email ?? (log.new_values as Record<string, string> | null)?.email ?? "unknown recipient"}.`;
    }

    return `${log.table_name}${log.record_id ? `:${log.record_id}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activity Audit Log</h2>
        <p className="text-gray-600">
          Track privileged user, permission, settings, invite, and automation
          actions.
        </p>
      </div>

      {auditLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Audit Entries
            </h3>
            <p className="text-gray-500">
              No sensitive actions have been recorded yet. When admins change
              roles, permissions, settings, invites, or automation controls,
              they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {auditLogs.map((log) => {
            const category = log.metadata?.category ?? "data";
            const severity = log.metadata?.severity ?? "info";

            return (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-base">
                          {formatAction(log.action)}
                        </CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>
                            {log.userprofile?.first_name}{" "}
                            {log.userprofile?.last_name}
                          </span>
                          <span className="text-gray-400">ΓÇó</span>
                          <span>{log.userprofile?.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>
                        {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{category}</Badge>
                      <Badge className={getSeverityBadgeColor(severity)}>
                        {severity}
                      </Badge>
                      <Badge variant="secondary">{log.table_name}</Badge>
                    </div>
                    <p className="text-sm text-gray-700">
                      {describeChange(log)}
                    </p>

                    {log.performed_byprofile && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Changed by:</strong>{" "}
                        {log.performed_byprofile.first_name}{" "}
                        {log.performed_byprofile.last_name} (
                        {log.performed_byprofile.email})
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
