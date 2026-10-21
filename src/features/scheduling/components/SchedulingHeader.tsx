/**
 * Compact schedule mark. The week controls sit beside this title so the
 * page does not open with a separate title bar.
 */

interface SchedulingHeaderProps {
  title: string;
}

export function SchedulingHeader({ title }: SchedulingHeaderProps) {
  return (
    <h1 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
      {title}
    </h1>
  );
}
