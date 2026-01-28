import { forwardRef } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ClickableLabelProps
  extends React.ComponentPropsWithoutRef<typeof Label> {
  enabled: boolean;
}

const ClickableLabel = forwardRef<HTMLLabelElement, ClickableLabelProps>(
  ({ enabled, className, children, ...labelProps }, ref) => {
    return (
      <Label
        {...labelProps}
        ref={ref}
        className={cn(
          "flex cursor-pointer select-none items-center justify-between text-sm font-medium",
          enabled ? "text-foreground" : "text-muted-foreground",
          className,
        )}
      >
        <span>{children}</span>
        <span
          className={cn(
            "text-xs font-semibold",
            enabled
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-muted-foreground",
          )}
        >
          {enabled ? "On" : "Off"}
        </span>
      </Label>
    );
  },
);

ClickableLabel.displayName = "ClickableLabel";

export default ClickableLabel;
