import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw } from 'lucide-react';

interface CertificationsHeaderProps {
  loading: boolean;
  onRefresh?: () => void;
  title: string;
  description?: string;
}

export function CertificationsHeader({ loading, onRefresh, title, description }: CertificationsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Certifications</p>
        <h1 className="mt-1 text-3xl font-bold">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">{loading ? 'Syncing…' : 'Live data'}</Badge>
        <Button type="button" variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
    </header>
  );
}

export default CertificationsHeader;
