import React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCan } from "@/hooks/useCan";
import { type PermissionKey } from "@/hooks/useUserPermissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionButtonProps extends ButtonProps {
  permission: PermissionKey;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipMessage?: string;
  hideWhenDenied?: boolean;
}

/**
 * Button component that respects permissions
 * Can be disabled, hidden, or show tooltip when permission is denied
 */
export function PermissionButton({
  permission,
  fallback = null,
  showTooltip = true,
  tooltipMessage,
  hideWhenDenied = false,
  children,
  disabled,
  ...props
}: PermissionButtonProps) {
  const { can, isLoading } = useCan();

  if (isLoading) {
    return (
      <Button disabled {...props}>
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
      </Button>
    );
  }

  const hasPermission = can(permission);

  // Hide button when permission denied and hideWhenDenied is true
  if (!hasPermission && hideWhenDenied) {
    return <>{fallback}</>;
  }

  // Show tooltip when permission denied and showTooltip is true
  if (!hasPermission && showTooltip) {
    const message =
      tooltipMessage || `You don't have permission: ${permission}`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled={true} {...props}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Regular button with permission-based disabled state
  return (
    <Button disabled={!hasPermission || disabled} {...props}>
      {children}
    </Button>
  );
}

/**
 * Multiple permission button - requires ANY or ALL permissions
 */
interface MultiPermissionButtonProps extends ButtonProps {
  permissions: PermissionKey[];
  strategy?: "any" | "all";
  fallback?: React.ReactNode;
  showTooltip?: boolean;
  tooltipMessage?: string;
  hideWhenDenied?: boolean;
}

export function MultiPermissionButton({
  permissions,
  strategy = "any",
  fallback = null,
  showTooltip = true,
  tooltipMessage,
  hideWhenDenied = false,
  children,
  disabled,
  ...props
}: MultiPermissionButtonProps) {
  const { canAny, canAll, isLoading } = useCan();

  if (isLoading) {
    return (
      <Button disabled {...props}>
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
      </Button>
    );
  }

  const hasPermission =
    strategy === "any" ? canAny(permissions) : canAll(permissions);

  // Hide button when permission denied and hideWhenDenied is true
  if (!hasPermission && hideWhenDenied) {
    return <>{fallback}</>;
  }

  // Show tooltip when permission denied and showTooltip is true
  if (!hasPermission && showTooltip) {
    const message =
      tooltipMessage ||
      `You don't have required permissions: ${permissions.join(", ")}`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled={true} {...props}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Regular button with permission-based disabled state
  return (
    <Button disabled={!hasPermission || disabled} {...props}>
      {children}
    </Button>
  );
}
