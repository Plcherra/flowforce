import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BottomIconButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  expanded?: boolean;
  className?: string;
}

export function BottomIconButton({
  label,
  active,
  onClick,
  children,
  expanded,
  className,
}: BottomIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? "page" : undefined}
          aria-expanded={expanded}
          aria-haspopup={expanded === undefined ? undefined : "dialog"}
          onClick={onClick}
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary",
            active && "text-primary",
            className,
          )}
        >
          {children}
          {active ? (
            <span
              aria-hidden="true"
              className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
            />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
