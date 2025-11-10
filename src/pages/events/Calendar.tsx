import React, { Suspense, lazy } from 'react';
import { SchedulingProvider } from '@/contexts/SchedulingContext';
import { Skeleton } from '@/components/ui/skeleton';

const EventsCalendarContent = lazy(() =>
  import('@/features/calendar/components/EventsCalendarContent').then((module) => ({
    default: module.EventsCalendarContent,
  })),
);

export default function EventsCalendarPage() {
  return (
    <SchedulingProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background px-4 py-6 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        }
      >
        <EventsCalendarContent />
      </Suspense>
    </SchedulingProvider>
  );
}
