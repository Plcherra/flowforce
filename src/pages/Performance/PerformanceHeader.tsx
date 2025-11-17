import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

interface PerformanceHeaderProps {
  loading: boolean;
  onRefresh?: () => void;
  lastUpdatedLabel?: string | null;
}

export function PerformanceHeader({ loading, onRefresh, lastUpdatedLabel }: PerformanceHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Performance</p>
        <h1 className="mt-1 text-3xl font-bold">Performance & Reviews</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track coaching signals, XP progression, and review outcomes for every employee.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">
          {loading ? 'Refreshing data…' : lastUpdatedLabel ? `Synced ${lastUpdatedLabel}` : 'Live data'}
        </Badge>
        <Button type="button" variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
    </header>
  );
}

export default PerformanceHeader;
