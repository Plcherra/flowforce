import { Skeleton } from "@/components/ui/skeleton";

interface IllustrationSkeletonProps {
  title?: string;
  className?: string;
}

export function IllustrationSkeleton({
  title,
  className = "h-32 w-full",
}: IllustrationSkeletonProps) {
  return (
    <div
      className={`bg-muted rounded-lg flex items-center justify-center ${className}`}
    >
      {title ? (
        <span className="text-muted-foreground text-sm font-medium">{title}</span>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </div>
  );
}
