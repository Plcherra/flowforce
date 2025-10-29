
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  CheckSquare,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DashboardStatsProps {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    todaysShifts: number;
    pendingTimeOff: number;
    approvedTimeOffUpcoming: number;
    timeOffDaysUsed: number;
    timeOffBalanceRemaining: number;
  };
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const DashboardStats = React.memo(function DashboardStats({ stats, loading, error, onRetry }: DashboardStatsProps) {
  const { t } = useTranslation();
  
  if (error && onRetry) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-2">Failed to load statistics</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={onRetry} variant="outline" size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.stats.totalEmployees')}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '-' : stats.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {loading ? '-' : stats.activeEmployees} {t('dashboard.stats.activeEmployees')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.stats.departments')}</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '-' : stats.totalDepartments}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.stats.activeDepartments')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.stats.todaysShifts')}</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '-' : stats.todaysShifts}</div>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.stats.scheduledToday')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.stats.pendingRequests')}</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '-' : stats.pendingTimeOff}</div>
          <p className="text-xs text-muted-foreground">
            {loading
              ? '-'
              : t('dashboard.stats.timeOffRequestsDetail', {
                  approved: stats.approvedTimeOffUpcoming,
                  used: stats.timeOffDaysUsed,
                })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('dashboard.stats.timeOffBalance')}</CardTitle>
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? '-' : stats.timeOffBalanceRemaining}
          </div>
          <p className="text-xs text-muted-foreground">
            {loading
              ? '-'
              : t('dashboard.stats.timeOffBalanceHint', { used: stats.timeOffDaysUsed })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

export default DashboardStats;
