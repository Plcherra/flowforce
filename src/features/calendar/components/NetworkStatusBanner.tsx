import { cn } from "@/lib/utils";
import { FeatureErrorState } from "@/shared/components/FeatureErrorState";
import { FeatureSetupRequiredState } from "@/shared/components/FeatureSetupRequiredState";
import {
  getSupabaseSetupMessage,
  isMissingBackendResourceError,
} from "@/shared/utils/supabaseErrors";
import { CalendarDays } from "lucide-react";

interface NetworkStatusBannerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  errorMessage?: string | null;
  errorCode?: string | null;
  moduleName?: string;
  missingResources?: string[];
}

export function NetworkStatusBanner({
  errorMessage,
  errorCode,
  moduleName = "Calendar",
  missingResources = ["calendar_events_full", "calendar_events", "schedules"],
  className,
  ...rest
}: NetworkStatusBannerProps) {
  if (!errorMessage) {
    return null;
  }

  const isMissingSchema =
    errorCode === "42P01" ||
    isMissingBackendResourceError(errorMessage, missingResources);

  if (isMissingSchema) {
    return (
      <div className={cn("max-w-4xl", className)} {...rest}>
        <FeatureSetupRequiredState
          title={`${moduleName} module is not fully set up yet`}
          description={getSupabaseSetupMessage(errorMessage, moduleName)}
          icon={<CalendarDays className="h-5 w-5" />}
          setupDescription={
            <>
              Missing calendar database resources. Restore the calendar and
              scheduling migrations, then refresh this page.
            </>
          }
        />
      </div>
    );
  }

  return (
    <FeatureErrorState
      title={`${moduleName} offline`}
      description={errorMessage}
      className={cn("max-w-4xl", className)}
      {...rest}
    />
  );
}
