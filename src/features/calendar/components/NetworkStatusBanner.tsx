import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const MIGRATION_HINT =
  "Calendar tables are missing. Run supabase/migrations/20251101090000_calendar_events.sql and redeploy.";

interface NetworkStatusBannerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  errorMessage?: string | null;
  errorCode?: string | null;
}

export function NetworkStatusBanner({
  errorMessage,
  errorCode,
  className,
  ...rest
}: NetworkStatusBannerProps) {
  if (!errorMessage) {
    return null;
  }

  const isMissingSchema = errorCode === "42P01";
  const description = isMissingSchema ? MIGRATION_HINT : errorMessage;
  const title = isMissingSchema
    ? "Calendar schema missing"
    : "Calendar offline";

  return (
    <Alert
      variant="destructive"
      className={cn("max-w-4xl", className)}
      {...rest}
    >
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
