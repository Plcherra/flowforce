
import { Skeleton } from '@/components/ui/skeleton';

interface IllustrationSkeletonProps {
  title?: string;
  className?: string;
}

export function IllustrationSkeleton({ title, className = "h-32 w-full" }: IllustrationSkeletonProps) {
  return (
    <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
      {title ? (
        <span className="text-gray-500 text-sm font-medium">{title}</span>
      ) : (
        <Skeleton className="h-full w-full" />
      )}
    </div>
  );
}
