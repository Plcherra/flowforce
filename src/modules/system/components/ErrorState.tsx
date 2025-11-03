import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div>
        <h2 className="text-lg font-semibold text-destructive">{title}</h2>
        <p className="mt-2 text-sm text-destructive/80">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
