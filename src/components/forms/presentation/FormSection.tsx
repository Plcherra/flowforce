import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border/70 bg-card', className)}>
      <div className="bg-muted/50 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
    </section>
  );
}
