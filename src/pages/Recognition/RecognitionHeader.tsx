import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Sparkles } from 'lucide-react';

interface RecognitionHeaderProps {
  loading: boolean;
  syncing: boolean;
  totalRecognitions: number;
  onRefresh?: () => void;
  onSync?: () => void;
}

export function RecognitionHeader({ loading, syncing, totalRecognitions, onRefresh, onSync }: RecognitionHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Recognition</p>
        <h1 className="mt-1 text-3xl font-bold">Recognition & Culture</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Celebrate wins, monitor badge unlocks, and keep Copilot automation informed.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">{totalRecognitions} recognitions tracked</Badge>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button type="button" onClick={onSync} disabled={syncing}>
          <Sparkles className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync automation
        </Button>
      </div>
    </header>
  );
}

export default RecognitionHeader;
