import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface FormMetaCardProps {
  title?: string;
  userInitials?: string;
  userName?: string;
  timestamp?: string;
  timezone?: string;
  entryId?: string;
  statusLabel?: string;
  className?: string;
}

export function FormMetaCard({
  title,
  userInitials,
  userName,
  timestamp,
  timezone,
  entryId,
  statusLabel,
  className,
}: FormMetaCardProps) {
  const initials = userInitials && userInitials.trim().length > 0 ? userInitials.trim() : '—';

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm',
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <Avatar className="h-12 w-12 text-base shadow-inner">
          <AvatarFallback className="bg-muted text-foreground/80">{initials}</AvatarFallback>
        </Avatar>
        <div>
          {title && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>}
          <p className="text-base font-semibold text-foreground">{userName || '—'}</p>
          {statusLabel && (
            <Badge variant="outline" className="mt-1 bg-muted/40 text-xs font-semibold uppercase tracking-wide">
              {statusLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start text-sm text-muted-foreground sm:items-end">
        {timestamp && <span className="font-medium text-foreground">{timestamp}</span>}
        {timezone && <span>{timezone}</span>}
        {entryId && <span className="font-semibold text-foreground/80">{entryId}</span>}
      </div>
    </div>
  );
}
