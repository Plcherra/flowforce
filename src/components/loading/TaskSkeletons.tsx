import { Skeleton } from '@/components/ui/skeleton';

export const TaskCardSkeleton = () => (
  <div className="rounded-lg border bg-card">
    <div className="space-y-2 border-b px-4 py-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
    <div className="space-y-2 px-4 py-3">
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  </div>
);

export const TaskPageSkeleton = ({ isMobile }: { isMobile: boolean }) => (
  <div className={isMobile ? 'space-y-4 px-4 pb-6' : 'space-y-6 max-w-7xl mx-auto px-6 pb-10'}>
    <div className={isMobile ? 'space-y-3' : 'flex items-center justify-between'}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>

    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>

    <div className="rounded-lg border border-dashed bg-card p-4 space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-48" />
    </div>

    <div className={isMobile ? 'space-y-3' : 'grid grid-cols-1 gap-6 lg:grid-cols-3'}>
      <div className={isMobile ? 'space-y-3' : 'space-y-4 lg:col-span-2'}>
        {[0, 1, 2].map((item) => (
          <TaskCardSkeleton key={item} />
        ))}
      </div>
      {!isMobile && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}
    </div>
  </div>
);

export const ActivityFeedSkeleton = () => (
  <div className="p-4 space-y-4">
    {[0, 1, 2].map((item) => (
      <div key={item} className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export const NotificationListSkeleton = () => (
  <div className="space-y-4 p-4" role="status" aria-live="polite">
    {[0, 1, 2].map((item) => (
      <div key={item} className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

export const TimelineSkeleton = () => (
  <div className="p-4 space-y-4">
    {[0, 1, 2].map((item) => (
      <div key={item} className="flex items-start gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const CommentsSkeleton = () => (
  <div className="space-y-3">
    {[0, 1].map((item) => (
      <div key={item} className="rounded-lg border bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    ))}
  </div>
);

export const ReminderListSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div key={item} className="rounded-lg border bg-card p-3 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    ))}
  </div>
);
