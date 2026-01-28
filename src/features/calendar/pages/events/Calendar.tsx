import React, { Suspense, lazy } from "react";
import { SchedulingProvider } from "@/contexts/SchedulingContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { PageLoader } from "@/components/common/PageLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { CalendarDays } from "lucide-react";

const EventsCalendarContent = lazy(() =>
  import("@/features/calendar/components/EventsCalendarContent").then(
    (module) => ({
      default: module.EventsCalendarContent,
    }),
  ),
);

export default function EventsCalendarPage() {
  const bootstrap = useCommunicationBootstrap();

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading calendar data..." />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load calendar</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Waiting for employee roster"
          description="Calendar access unlocks after your organization and employee data finish loading."
          icon={<CalendarDays className="h-5 w-5" />}
        />
      </div>
    );
  }

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
