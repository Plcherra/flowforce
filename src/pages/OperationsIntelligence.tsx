import { IdeaProvider, useIdeaContext } from '@/modules/operations/contexts/IdeaProvider';
import IdeaLayout from '@/modules/operations/components/idea/IdeaLayout';
import { Skeleton } from '@/components/ui/skeleton';

export default function OperationsIntelligence() {
  return (
    <IdeaProvider>
      <IdeaRouteContent />
    </IdeaProvider>
  );
}

function IdeaRouteContent() {
  const { ready, loading } = useIdeaContext();

  if (!ready) {
    return (
      <div className="space-y-6 px-4 py-6 md:px-8 lg:px-12">
        <IdeaSkeleton loading={loading} />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-8 lg:px-12">
      <IdeaLayout />
    </div>
  );
}

function IdeaSkeleton({ loading }: { loading: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="flex flex-wrap gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-32" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-border/50 bg-background/60 p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
      {loading ? <Skeleton className="h-64 w-full rounded-xl" /> : null}
    </div>
  );
}
