import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Activity, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLog() {
  const { data: auditLogs = [], isLoading, error, isAuditEnabled } = useAuditLogs();

  if (!isAuditEnabled) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Audit Logs Disabled</h3>
          <p className="text-gray-500">
            Enable the audit logs feature to track administrative actions in this view.
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
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Audit Log</h3>
          <p className="text-gray-500">
            Failed to load audit log data. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      staff: 'bg-gray-100 text-gray-800',
      supervisor: 'bg-green-100 text-green-800',
      manager: 'bg-blue-100 text-blue-800',
      admin: 'bg-red-100 text-red-800',
      owner: 'bg-purple-100 text-purple-800',
      employee: 'bg-yellow-100 text-yellow-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatRoleChange = (oldValues: any, newValues: any) => {
    const oldRole = oldValues?.role || 'unknown';
    const newRole = newValues?.role || 'unknown';
    return { oldRole, newRole };
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Role Change Audit Log</h2>
        <p className="text-gray-600">Track all role changes and administrative actions</p>
      </div>

      {auditLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Audit Entries</h3>
            <p className="text-gray-500">
              No role changes have been recorded yet. When users' roles are modified, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {auditLogs.map((log) => {
            const { oldRole, newRole } = formatRoleChange(log.old_values, log.new_values);
            
            return (
              <Card key={log.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-base">Role Change</CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>
                            {log.user_profile?.first_name} {log.user_profile?.last_name}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{log.user_profile?.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">From:</span>
                        <Badge className={getRoleBadgeColor(oldRole)}>
                          {oldRole.charAt(0).toUpperCase() + oldRole.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">To:</span>
                        <Badge className={getRoleBadgeColor(newRole)}>
                          {newRole.charAt(0).toUpperCase() + newRole.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    {log.performed_by_profile && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>Changed by:</strong> {log.performed_by_profile.first_name} {log.performed_by_profile.last_name} ({log.performed_by_profile.email})
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
