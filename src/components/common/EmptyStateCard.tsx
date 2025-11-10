import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateCardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
  'data-testid'?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className,
  contentClassName,
  'data-testid': dataTestId,
}: EmptyStateCardProps) {
  return (
    <Card data-testid={dataTestId} className={cn('border-dashed border-muted-foreground/30 bg-muted/10', className)}>
      <CardContent
        className={cn(
          'flex flex-col gap-4 py-6 text-center sm:flex-row sm:text-left sm:items-center sm:justify-between',
          contentClassName,
        )}
      >
        <div className="flex items-center gap-4">
          {icon && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
              {icon}
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {action && <div className="self-center sm:self-auto">{action}</div>}
      </CardContent>
    </Card>
  );
}
