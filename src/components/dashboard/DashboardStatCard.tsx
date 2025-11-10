import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardStatCardProps {
  title: string;
  description?: string;
  value: number | string;
  loading?: boolean;
  className?: string;
  footer?: React.ReactNode;
}

export function DashboardStatCard({
  title,
  description,
  value,
  loading,
  className,
  footer,
}: DashboardStatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className={cn('space-y-2')}>
        <div className="text-3xl font-bold leading-tight">
          {loading ? <Skeleton className="h-8 w-16" /> : value}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
