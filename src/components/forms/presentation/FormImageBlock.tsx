import { cn } from '@/lib/utils';

interface FormImageBlockProps {
  caption?: string;
  src?: string;
  alt?: string;
  className?: string;
}

export function FormImageBlock({ caption, src, alt, className }: FormImageBlockProps) {
  if (!caption && !src) {
    return null;
  }

  return (
    <figure className={cn('space-y-3', className)}>
      {caption && <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{caption}</figcaption>}
      {src ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt ?? caption ?? ''} className="h-auto w-full object-cover" />
        </div>
      ) : (
        <div className="h-40 rounded-xl border border-dashed border-border/60 bg-muted/10" aria-hidden="true" />
      )}
    </figure>
  );
}
