import { cn } from '@/lib/utils';

interface FormNarrativeBlockProps {
  title?: string;
  value?: string;
  bulleted?: boolean;
  className?: string;
}

export function FormNarrativeBlock({ title, value, bulleted = false, className }: FormNarrativeBlockProps) {
  const cleanedValue = value?.trim();
  const segments = cleanedValue ? cleanedValue.split('\n').map((line) => line.trim()).filter(Boolean) : [];

  return (
    <div className={cn('space-y-2', className)}>
      {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
      {segments.length === 0 ? (
        <div className="h-24 rounded-lg border border-dashed border-border/60 bg-muted/10" aria-hidden="true" />
      ) : bulleted ? (
        <ul className="list-disc space-y-1 pl-6 text-sm leading-relaxed text-foreground/90">
          {segments.map((segment, index) => (
            <li key={`${segment}-${index}`}>{segment}</li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{segments.join('\n')}</p>
      )}
    </div>
  );
}
