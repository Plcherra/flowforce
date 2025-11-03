import { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-muted-foreground/30 p-10 text-center">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
