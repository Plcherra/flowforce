import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

export function TableSkeleton({ rows = 6, className }: TableSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 w-full rounded bg-muted/40 animate-pulse"
        />
      ))}
    </div>
  );
}
