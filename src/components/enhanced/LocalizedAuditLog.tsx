import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { Activity, User, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { I18nHelpers } from '@/utils/i18nHelpers';

/**
 * Enhanced Audit Log demonstrating all Phase 5 challenges addressed:
 * 1. Dynamic Content: Localized action types and user data
 * 2. Pluralization: Proper plural forms for counts
 * 3. Context: Context-aware role translations
 * 4. Validation: Localized error messages
 * 5. Date/Number Formatting: Regional formatting
 */
export default function LocalizedAuditLog() {
  const { data: auditLogs = [], isLoading, error } = useAuditLogs();
  const { t } = useTranslation();

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
            {t('audit.errorLoading')}
          </h3>
          <p className="text-gray-500">
            {t('audit.errorLoadingDescription')}
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

  const getLocalizedActionType = (action: string) => {
    // Challenge 3: Context-aware translations
    return I18nHelpers.getContextualTranslation('audit', action, t(`audit.${action}`));
  };

  const formatRelativeTime = (date: string) => {
    // Challenge 5: Regional date/time formatting
    return I18nHelpers.formatRelativeTime(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('audit.roleChange')} {t('common.auditLog')}</h2>
        <p className="text-gray-600">
          {/* Challenge 2: Pluralization */}
          {I18nHelpers.pluralize('plurals.entry', auditLogs.length)} {t('common.tracked')}
        </p>
      </div>

      {auditLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              {t('audit.noEntries')}
            </h3>
            <p className="text-gray-500">
              {t('audit.noEntriesDescription')}
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
                        <CardTitle className="text-base">
                          {getLocalizedActionType('roleChange')}
                        </CardTitle>
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
                      {/* Challenge 5: Regional date formatting */}
                      <span>{I18nHelpers.formatDate(log.created_at, 'datetime')}</span>
                      <span className="text-gray-400">•</span>
                      <span>{formatRelativeTime(log.created_at)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          {t('audit.from')}:
                        </span>
                        <Badge className={getRoleBadgeColor(oldRole)}>
                          {/* Challenge 3: Context-aware role translation */}
                          {I18nHelpers.getContextualTranslation('roles', oldRole, oldRole)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">
                          {t('audit.to')}:
                        </span>
                        <Badge className={getRoleBadgeColor(newRole)}>
                          {I18nHelpers.getContextualTranslation('roles', newRole, newRole)}
                        </Badge>
                      </div>
                    </div>
                    
                    {log.performed_by_profile && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>{t('audit.changedBy')}:</strong> {log.performed_by_profile.first_name} {log.performed_by_profile.last_name} ({log.performed_by_profile.email})
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