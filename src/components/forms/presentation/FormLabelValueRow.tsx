import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormLabelValueRowProps {
  label: string;
  value?: ReactNode;
  emphasis?: 'none' | 'boldValue' | 'bullet';
  className?: string;
}

const isEmptyValue = (value?: ReactNode) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  return false;
};

export function FormLabelValueRow({ label, value, emphasis = 'none', className }: FormLabelValueRowProps) {
  const empty = isEmptyValue(value);

  return (
    <div className={cn('flex flex-col gap-1 border-b border-border/50 pb-3 last:border-b-0 last:pb-0', className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {empty ? (
        <div className="h-6 rounded-md border border-dashed border-border/60 bg-muted/20" aria-hidden="true" />
      ) : (
        <div
          className={cn(
            'text-sm text-foreground',
            emphasis === 'boldValue' && 'font-semibold',
            emphasis === 'bullet' && 'pl-4',
          )}
        >
          {emphasis === 'bullet' && !Array.isArray(value) ? (
            <ul className="list-disc space-y-1 pl-4">{value}</ul>
          ) : (
            value
          )}
        </div>
      )}
    </div>
  );
}
