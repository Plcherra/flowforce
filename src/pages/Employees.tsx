import { lazy, Suspense } from 'react';
import { PageLoader } from '@/components/common/PageLoader';

const TeamDirectory = lazy(async () =>
  import('@/features/employees/components/TeamDirectory').then((module) => ({ default: module.TeamDirectory })),
);

export default function EmployeesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TeamDirectory />
    </Suspense>
  );
}
