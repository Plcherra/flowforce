import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/common/PageLoader';
import { useCommunicationBootstrap } from '@/hooks/useCommunicationBootstrap';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyStateCard } from '@/components/common/EmptyStateCard';
import { Users } from 'lucide-react';

const TeamDirectory = lazy(async () =>
  import('@/features/employees/components/TeamDirectory').then((module) => ({ default: module.TeamDirectory })),
);

export default function EmployeesPage() {
  const bootstrap = useCommunicationBootstrap({ includeInactiveEmployees: true });

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading employee directory..." />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load directory</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Waiting for your roster"
          description="Employee tools unlock once we finish loading your organization and roster."
          icon={<Users className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <TeamDirectory />
    </Suspense>
  );
}
